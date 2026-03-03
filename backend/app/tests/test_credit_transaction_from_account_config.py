import importlib

from fastapi.testclient import TestClient


def test_credit_transaction_uses_account_credit_config_without_precreated_card(tmp_path, monkeypatch):
    db_path = tmp_path / 'credit-from-account.db'
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_path}')

    config_module = importlib.import_module('app.core.config')
    importlib.reload(config_module)
    session_module = importlib.import_module('app.db.session')
    importlib.reload(session_module)
    main_module = importlib.import_module('app.main')
    importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        reg = client.post('/api/auth/register', json={'email': 'credittx@example.com', 'password': '123456', 'full_name': 'Credit Tx'})
        token = reg.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        created = client.post('/api/accounts', headers=headers, json={
            'name': 'Nubank',
            'bank': 'nubank',
            'account_type': 'Corrente',
            'card_types': ['Crédito'],
            'notes': '',
            'credit_limit': 1000,
            'credit_used': 0,
            'close_day': 8,
            'due_day': 15,
            'balance': 0,
        })
        assert created.status_code == 200

        # Simulate missing card row (legacy/manual inconsistency)
        cards = client.get('/api/cards', headers=headers).json()
        assert len(cards) == 1
        client.delete(f"/api/cards/{cards[0]['id']}", headers=headers)

        tx = client.post('/api/transactions', headers=headers, json={
            'date': '2026-03-03',
            'direction': 'Saída',
            'amount': 120,
            'method': 'Crédito',
            'account': 'Nubank',
            'card': 'Nubank',
            'kind': 'Normal',
            'category': 'Teste',
            'subcategory': '',
            'description': 'Compra crédito',
            'notes': '',
        })
        assert tx.status_code == 200

        accounts = client.get('/api/accounts', headers=headers).json()
        assert accounts[0]['credit_used'] == 120
        assert accounts[0]['credit_available'] == 880
