import importlib

from fastapi.testclient import TestClient


def test_pix_transaction_updates_account_balance(tmp_path, monkeypatch):
    db_path = tmp_path / 'balance-methods.db'
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_path}')

    config_module = importlib.import_module('app.core.config')
    importlib.reload(config_module)
    session_module = importlib.import_module('app.db.session')
    importlib.reload(session_module)
    main_module = importlib.import_module('app.main')
    importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        reg = client.post('/api/auth/register', json={'email': 'pixbal@example.com', 'password': '123456', 'full_name': 'Pix Bal'})
        token = reg.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        client.post('/api/accounts', headers=headers, json={
            'name': 'Conta Principal',
            'bank': 'itau',
            'account_type': 'Corrente',
            'card_types': ['Débito'],
            'notes': '',
            'credit_limit': 0,
            'credit_used': 0,
            'close_day': None,
            'due_day': None,
            'balance': 0,
        })

        tx = client.post('/api/transactions', headers=headers, json={
            'date': '2026-03-03',
            'direction': 'Entrada',
            'amount': 250,
            'method': 'Pix',
            'account': 'Conta Principal',
            'card': '',
            'kind': 'Normal',
            'category': 'Teste',
            'subcategory': '',
            'description': 'Pix recebido',
            'notes': '',
        })
        assert tx.status_code == 200

        listed = client.get('/api/accounts', headers=headers).json()
        assert listed[0]['balance'] == 250
