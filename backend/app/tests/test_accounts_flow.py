import importlib

from fastapi.testclient import TestClient


def test_register_and_create_account_in_sqlite(tmp_path, monkeypatch):
    db_path = tmp_path / 'flow.db'
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_path}')

    config_module = importlib.import_module('app.core.config')
    importlib.reload(config_module)
    session_module = importlib.import_module('app.db.session')
    importlib.reload(session_module)
    main_module = importlib.import_module('app.main')
    importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        reg = client.post(
            '/api/auth/register',
            json={'email': 'flow@example.com', 'password': '123456', 'full_name': 'Flow User'},
        )
        assert reg.status_code == 200

        token = reg.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        create = client.post(
            '/api/accounts',
            headers=headers,
            json={
                'name': 'Conta Teste',
                'bank': 'itau',
                'account_type': 'Corrente',
                'card_types': ['Crédito'],
                'credit_limit': 1500,
                'close_day': 8,
                'due_day': 15,
                'balance': 0,
            },
        )
        assert create.status_code == 200

        listed = client.get('/api/accounts', headers=headers)
        assert listed.status_code == 200
        data = listed.json()
        assert len(data) == 1
        assert data[0]['name'] == 'Conta Teste'
