import importlib

from fastapi.testclient import TestClient


def _bootstrap(tmp_path, monkeypatch, name='auth.db'):
    db_path = tmp_path / name
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_path}')
    config_module = importlib.import_module('app.core.config')
    importlib.reload(config_module)
    session_module = importlib.import_module('app.db.session')
    importlib.reload(session_module)
    main_module = importlib.import_module('app.main')
    importlib.reload(main_module)
    return main_module


def test_register_validates_email_and_password(tmp_path, monkeypatch):
    main_module = _bootstrap(tmp_path, monkeypatch, 'reg.db')
    with TestClient(main_module.app) as client:
        bad_email = client.post(
            '/api/auth/register',
            json={'email': 'not-an-email', 'password': '123456', 'full_name': 'X'},
        )
        assert bad_email.status_code == 422

        weak = client.post(
            '/api/auth/register',
            json={'email': 'a@example.com', 'password': '123', 'full_name': 'X'},
        )
        assert weak.status_code == 422


def test_register_normalizes_email_and_blocks_duplicates(tmp_path, monkeypatch):
    main_module = _bootstrap(tmp_path, monkeypatch, 'dup.db')
    with TestClient(main_module.app) as client:
        first = client.post(
            '/api/auth/register',
            json={'email': '  Person@Example.COM ', 'password': 'secret1', 'full_name': 'P'},
        )
        assert first.status_code == 200

        dup = client.post(
            '/api/auth/register',
            json={'email': 'person@example.com', 'password': 'secret1', 'full_name': 'P'},
        )
        assert dup.status_code == 400


def test_password_reset_full_flow(tmp_path, monkeypatch):
    main_module = _bootstrap(tmp_path, monkeypatch, 'reset.db')
    with TestClient(main_module.app) as client:
        client.post(
            '/api/auth/register',
            json={'email': 'user@example.com', 'password': 'oldpass1', 'full_name': 'U'},
        )

        forgot = client.post(
            '/api/auth/forgot-password',
            json={'email': 'user@example.com'},
        )
        assert forgot.status_code == 200
        token = forgot.json().get('reset_token')
        assert token

        # Token from a non-existent email returns success but no token (no enumeration)
        unknown = client.post(
            '/api/auth/forgot-password',
            json={'email': 'nobody@example.com'},
        )
        assert unknown.status_code == 200
        assert unknown.json().get('reset_token') is None

        # Old password no longer logs in after reset
        reset = client.post(
            '/api/auth/reset-password',
            json={'token': token, 'password': 'newpass1'},
        )
        assert reset.status_code == 200

        old_login = client.post(
            '/api/auth/login',
            json={'email': 'user@example.com', 'password': 'oldpass1'},
        )
        assert old_login.status_code == 401

        new_login = client.post(
            '/api/auth/login',
            json={'email': 'user@example.com', 'password': 'newpass1'},
        )
        assert new_login.status_code == 200

        # Token is single-use
        replay = client.post(
            '/api/auth/reset-password',
            json={'token': token, 'password': 'another1'},
        )
        assert replay.status_code == 400


def test_change_password_requires_current(tmp_path, monkeypatch):
    main_module = _bootstrap(tmp_path, monkeypatch, 'change.db')
    with TestClient(main_module.app) as client:
        reg = client.post(
            '/api/auth/register',
            json={'email': 'cp@example.com', 'password': 'oldpass1', 'full_name': 'C'},
        )
        token = reg.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        bad = client.post(
            '/api/users/me/change-password',
            headers=headers,
            json={'current_password': 'wrong', 'new_password': 'newpass1'},
        )
        assert bad.status_code == 400

        ok = client.post(
            '/api/users/me/change-password',
            headers=headers,
            json={'current_password': 'oldpass1', 'new_password': 'newpass1'},
        )
        assert ok.status_code == 200

        login = client.post(
            '/api/auth/login',
            json={'email': 'cp@example.com', 'password': 'newpass1'},
        )
        assert login.status_code == 200


def test_update_profile_and_email_uniqueness(tmp_path, monkeypatch):
    main_module = _bootstrap(tmp_path, monkeypatch, 'profile.db')
    with TestClient(main_module.app) as client:
        a = client.post(
            '/api/auth/register',
            json={'email': 'a@example.com', 'password': 'aaaaaa1', 'full_name': 'A'},
        )
        client.post(
            '/api/auth/register',
            json={'email': 'b@example.com', 'password': 'bbbbbb1', 'full_name': 'B'},
        )

        token = a.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        rename = client.put(
            '/api/users/me',
            headers=headers,
            json={'full_name': 'Alice Smith', 'email': 'alice@example.com'},
        )
        assert rename.status_code == 200
        body = rename.json()
        assert body['full_name'] == 'Alice Smith'
        assert body['email'] == 'alice@example.com'

        clash = client.put(
            '/api/users/me',
            headers=headers,
            json={'full_name': 'Alice', 'email': 'b@example.com'},
        )
        assert clash.status_code == 400


def test_delete_account_requires_password(tmp_path, monkeypatch):
    main_module = _bootstrap(tmp_path, monkeypatch, 'delete.db')
    with TestClient(main_module.app) as client:
        reg = client.post(
            '/api/auth/register',
            json={'email': 'gone@example.com', 'password': 'pass1234', 'full_name': 'G'},
        )
        token = reg.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        bad = client.request(
            'DELETE',
            '/api/users/me',
            headers=headers,
            json={'password': 'wrongpw1'},
        )
        assert bad.status_code == 400

        ok = client.request(
            'DELETE',
            '/api/users/me',
            headers=headers,
            json={'password': 'pass1234'},
        )
        assert ok.status_code == 200

        # Account no longer exists -> login fails
        relogin = client.post(
            '/api/auth/login',
            json={'email': 'gone@example.com', 'password': 'pass1234'},
        )
        assert relogin.status_code == 401
