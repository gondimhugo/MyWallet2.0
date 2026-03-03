import importlib

from fastapi.testclient import TestClient


def test_account_credit_inferred_from_limit(tmp_path, monkeypatch):
    db_path = tmp_path / 'account-credit-infer.db'
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_path}')

    config_module = importlib.import_module('app.core.config')
    importlib.reload(config_module)
    session_module = importlib.import_module('app.db.session')
    importlib.reload(session_module)
    main_module = importlib.import_module('app.main')
    importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        reg = client.post('/api/auth/register', json={'email': 'infer@example.com', 'password': '123456', 'full_name': 'Infer User'})
        token = reg.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        created = client.post('/api/accounts', headers=headers, json={
            'name': 'Itaú',
            'bank': 'itau',
            'account_type': 'Corrente',
            'card_types': [],
            'notes': '',
            'credit_limit': 1200,
            'credit_used': 0,
            'close_day': 8,
            'due_day': 15,
            'balance': 0,
        })
        assert created.status_code == 200
        data = created.json()
        assert 'Crédito' in data['card_types']
        assert data['credit_limit'] == 1200

        cards = client.get('/api/cards', headers=headers)
        assert cards.status_code == 200
        assert len(cards.json()) == 1
        assert cards.json()[0]['name'] == 'Itaú'
