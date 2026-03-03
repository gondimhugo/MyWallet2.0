import importlib

from fastapi.testclient import TestClient


def test_credit_used_and_available_updates_with_transactions(tmp_path, monkeypatch):
    db_path = tmp_path / 'credit-limit.db'
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_path}')

    config_module = importlib.import_module('app.core.config')
    importlib.reload(config_module)
    session_module = importlib.import_module('app.db.session')
    importlib.reload(session_module)
    main_module = importlib.import_module('app.main')
    importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        reg = client.post('/api/auth/register', json={'email': 'credit@example.com', 'password': '123456', 'full_name': 'Credit User'})
        token = reg.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        acc = client.post('/api/accounts', headers=headers, json={
            'name': 'Itaú',
            'bank': 'itau',
            'account_type': 'Corrente',
            'card_types': ['Crédito'],
            'notes': '',
            'credit_limit': 1000,
            'credit_used': 0,
            'close_day': 8,
            'due_day': 15,
            'balance': 0,
        })
        assert acc.status_code == 200

        tx = client.post('/api/transactions', headers=headers, json={
            'date': '2026-03-03',
            'direction': 'Saída',
            'amount': 300,
            'method': 'Crédito',
            'account': 'Itaú',
            'card': 'Itaú',
            'kind': 'Normal',
            'category': 'Teste',
            'subcategory': '',
            'description': 'Compra crédito',
            'notes': '',
        })
        assert tx.status_code == 200

        listed = client.get('/api/accounts', headers=headers).json()
        assert listed[0]['credit_used'] == 300
        assert listed[0]['credit_available'] == 700

        tx_id = tx.json()['id']
        rm = client.delete(f'/api/transactions/{tx_id}', headers=headers)
        assert rm.status_code == 200

        listed_after = client.get('/api/accounts', headers=headers).json()
        assert listed_after[0]['credit_used'] == 0
        assert listed_after[0]['credit_available'] == 1000
