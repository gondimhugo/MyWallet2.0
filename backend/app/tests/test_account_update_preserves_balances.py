import importlib

from fastapi.testclient import TestClient


def test_update_account_does_not_reset_balance_and_credit_used(tmp_path, monkeypatch):
    db_path = tmp_path / 'account-update.db'
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_path}')

    config_module = importlib.import_module('app.core.config')
    importlib.reload(config_module)
    session_module = importlib.import_module('app.db.session')
    importlib.reload(session_module)
    main_module = importlib.import_module('app.main')
    importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        reg = client.post('/api/auth/register', json={
            'email': 'upd@example.com',
            'password': '123456',
            'full_name': 'Update User',
        })
        token = reg.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        acc_resp = client.post('/api/accounts', headers=headers, json={
            'name': 'Nubank',
            'bank': 'nubank',
            'account_type': 'Corrente',
            'card_types': ['Débito', 'Crédito'],
            'notes': '',
            'credit_limit': 2000,
            'credit_used': 0,
            'close_day': 8,
            'due_day': 15,
            'balance': 0,
        })
        assert acc_resp.status_code == 200
        account_id = acc_resp.json()['id']

        # Incoming debit: balance becomes 500
        tx_in = client.post('/api/transactions', headers=headers, json={
            'date': '2026-03-03',
            'direction': 'Entrada',
            'amount': 500,
            'method': 'Pix',
            'account': 'Nubank',
            'card': '',
            'kind': 'Normal',
            'category': 'Teste',
            'subcategory': '',
            'description': 'Pix entrada',
            'notes': '',
        })
        assert tx_in.status_code == 200

        # Outgoing credit purchase: credit_used becomes 300
        tx_credit = client.post('/api/transactions', headers=headers, json={
            'date': '2026-03-04',
            'direction': 'Saída',
            'amount': 300,
            'method': 'Crédito',
            'account': 'Nubank',
            'card': 'Nubank',
            'kind': 'Normal',
            'category': 'Compras',
            'subcategory': '',
            'description': 'Compra crédito',
            'notes': '',
        })
        assert tx_credit.status_code == 200

        before_update = client.get('/api/accounts', headers=headers).json()[0]
        assert before_update['balance'] == 500
        assert before_update['credit_used'] == 300

        # Update only editable fields (notes). Client does NOT send balance/credit_used
        # to avoid overwriting them, but the schema still defaults to 0 if omitted.
        upd = client.put(f'/api/accounts/{account_id}', headers=headers, json={
            'name': 'Nubank',
            'bank': 'nubank',
            'account_type': 'Corrente',
            'card_types': ['Débito', 'Crédito'],
            'notes': 'Updated notes',
            'credit_limit': 2000,
            'close_day': 8,
            'due_day': 15,
        })
        assert upd.status_code == 200

        after_update = client.get('/api/accounts', headers=headers).json()[0]
        # Critical: balance and credit_used must be preserved across the update
        assert after_update['balance'] == 500, f"balance was reset to {after_update['balance']}"
        assert after_update['credit_used'] == 300, f"credit_used was reset to {after_update['credit_used']}"
        assert after_update['notes'] == 'Updated notes'
