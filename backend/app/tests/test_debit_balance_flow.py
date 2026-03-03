import importlib

from fastapi.testclient import TestClient


def test_debit_transaction_updates_account_balance(tmp_path, monkeypatch):
    db_path = tmp_path / 'debit-balance.db'
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_path}')

    config_module = importlib.import_module('app.core.config')
    importlib.reload(config_module)
    session_module = importlib.import_module('app.db.session')
    importlib.reload(session_module)
    main_module = importlib.import_module('app.main')
    importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        reg = client.post('/api/auth/register', json={'email': 'balance@example.com', 'password': '123456', 'full_name': 'Balance User'})
        token = reg.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        client.post('/api/accounts', headers=headers, json={
            'name': 'Bradesco',
            'bank': 'bradesco',
            'account_type': 'Corrente',
            'card_types': ['Débito'],
            'notes': '',
            'credit_limit': 0,
            'close_day': None,
            'due_day': None,
            'balance': 0,
        })

        tx = client.post('/api/transactions', headers=headers, json={
            'date': '2026-03-03',
            'direction': 'Entrada',
            'amount': 150,
            'method': 'Débito',
            'account': 'Bradesco',
            'card': '',
            'kind': 'Normal',
            'category': 'Teste',
            'subcategory': '',
            'description': 'Depósito',
            'notes': '',
        })
        assert tx.status_code == 200

        listed = client.get('/api/accounts', headers=headers).json()
        assert listed[0]['balance'] == 150

        tx_id = tx.json()['id']
        rm = client.delete(f'/api/transactions/{tx_id}', headers=headers)
        assert rm.status_code == 200

        listed_after = client.get('/api/accounts', headers=headers).json()
        assert listed_after[0]['balance'] == 0
