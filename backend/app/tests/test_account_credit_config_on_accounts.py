import importlib

from fastapi.testclient import TestClient


def test_account_with_credit_requires_limit_and_cycle_days(tmp_path, monkeypatch):
    db_path = tmp_path / 'account-credit-config.db'
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_path}')

    config_module = importlib.import_module('app.core.config')
    importlib.reload(config_module)
    session_module = importlib.import_module('app.db.session')
    importlib.reload(session_module)
    main_module = importlib.import_module('app.main')
    importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        reg = client.post('/api/auth/register', json={'email': 'accconf@example.com', 'password': '123456', 'full_name': 'Account Config'})
        token = reg.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        invalid = client.post('/api/accounts', headers=headers, json={
            'name': 'Banco X',
            'bank': 'otro',
            'account_type': 'Corrente',
            'card_types': ['Crédito'],
            'notes': '',
            'credit_limit': 0,
            'credit_used': 0,
            'close_day': 8,
            'due_day': 15,
            'balance': 0,
        })
        assert invalid.status_code == 400

        created = client.post('/api/accounts', headers=headers, json={
            'name': 'Banco Y',
            'bank': 'otro',
            'account_type': 'Corrente',
            'card_types': ['Crédito'],
            'notes': '',
            'credit_limit': 2500,
            'credit_used': 0,
            'close_day': 10,
            'due_day': 20,
            'balance': 0,
        })
        assert created.status_code == 200
        body = created.json()
        assert body['credit_limit'] == 2500
        assert body['close_day'] == 10
        assert body['due_day'] == 20


def test_accounts_list_recovers_cycle_days_from_legacy_card(tmp_path, monkeypatch):
    db_path = tmp_path / 'legacy-card-days.db'
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_path}')

    config_module = importlib.import_module('app.core.config')
    importlib.reload(config_module)
    session_module = importlib.import_module('app.db.session')
    importlib.reload(session_module)
    main_module = importlib.import_module('app.main')
    importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        reg = client.post('/api/auth/register', json={'email': 'legacy@example.com', 'password': '123456', 'full_name': 'Legacy User'})
        token = reg.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        account = client.post('/api/accounts', headers=headers, json={
            'name': 'Legacy Bank',
            'bank': 'otro',
            'account_type': 'Corrente',
            'card_types': ['Débito'],
            'notes': '',
            'credit_limit': 0,
            'credit_used': 0,
            'close_day': None,
            'due_day': None,
            'balance': 0,
        })
        assert account.status_code == 200

        card = client.post('/api/cards', headers=headers, json={
            'name': 'Legacy Bank',
            'close_day': 9,
            'due_day': 18,
        })
        assert card.status_code == 200

        listed = client.get('/api/accounts', headers=headers)
        assert listed.status_code == 200
        body = listed.json()[0]
        assert body['close_day'] == 9
        assert body['due_day'] == 18
