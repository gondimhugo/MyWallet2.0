import importlib
from pathlib import Path

from fastapi.testclient import TestClient



def test_startup_creates_schema_when_db_is_empty(monkeypatch, tmp_path):
    db_path = tmp_path / 'bootstrap.db'
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_path}')

    # Reload modules so the engine picks up DATABASE_URL from env.
    config_module = importlib.import_module('app.core.config')
    importlib.reload(config_module)
    session_module = importlib.import_module('app.db.session')
    importlib.reload(session_module)
    main_module = importlib.import_module('app.main')
    importlib.reload(main_module)

    payload = {'email': 'bootstrap@example.com', 'password': '123456', 'full_name': 'Bootstrap User'}
    with TestClient(main_module.app) as client:
        response = client.post('/api/auth/register', json=payload)

    assert response.status_code == 200
    assert response.json().get('access_token')
    assert Path(db_path).exists()
