import importlib

from fastapi.testclient import TestClient


def test_transactions_update_accounts_using_ids_and_require_card_for_invoice_payment(tmp_path, monkeypatch):
    db_path = tmp_path / 'tx-account-ids.db'
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_path}')

    config_module = importlib.import_module('app.core.config')
    importlib.reload(config_module)
    session_module = importlib.import_module('app.db.session')
    importlib.reload(session_module)
    main_module = importlib.import_module('app.main')
    importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        reg = client.post('/api/auth/register', json={'email': 'ids@example.com', 'password': '123456', 'full_name': 'IDs User'})
        token = reg.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        debit = client.post('/api/accounts', headers=headers, json={
            'name': 'Conta Principal',
            'bank': 'itau',
            'account_type': 'Corrente',
            'card_types': ['Débito'],
            'balance': 1000,
        }).json()

        credit = client.post('/api/accounts', headers=headers, json={
            'name': 'Cartao XPTO',
            'bank': 'nubank',
            'account_type': 'Corrente',
            'card_types': ['Crédito'],
            'credit_limit': 2000,
            'close_day': 8,
            'due_day': 15,
            'balance': 0,
        }).json()

        tx_credit = client.post('/api/transactions', headers=headers, json={
            'date': '2026-03-03',
            'direction': 'Saída',
            'amount': 300,
            'method': 'Crédito',
            'account_id': credit['id'],
            'account': '',
            'card': '',
            'kind': 'Normal',
            'description': 'Compra no crédito por id',
        })
        assert tx_credit.status_code == 200

        pay_missing_card = client.post('/api/transactions', headers=headers, json={
            'date': '2026-03-10',
            'direction': 'Saída',
            'amount': 100,
            'method': 'Pix',
            'account_id': debit['id'],
            'account': '',
            'kind': 'PagamentoFatura',
            'description': 'Pagamento incompleto',
        })
        assert pay_missing_card.status_code == 400

        pay_ok = client.post('/api/transactions', headers=headers, json={
            'date': '2026-03-10',
            'direction': 'Saída',
            'amount': 120,
            'method': 'Pix',
            'account_id': debit['id'],
            'account': '',
            'card_account_id': credit['id'],
            'card': '',
            'kind': 'PagamentoFatura',
            'description': 'Pagamento correto',
        })
        assert pay_ok.status_code == 200

        listed = client.get('/api/accounts', headers=headers).json()
        by_name = {a['name']: a for a in listed}

        assert by_name['Conta Principal']['balance'] == 880
        assert by_name['Cartao XPTO']['credit_used'] == 180
        assert by_name['Cartao XPTO']['credit_available'] == 1820
