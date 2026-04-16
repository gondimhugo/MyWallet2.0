import importlib

from fastapi.testclient import TestClient


def test_reassign_invoice_moves_all_transactions_to_target_month(tmp_path, monkeypatch):
    db_path = tmp_path / 'invoice-reassign.db'
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_path}')

    config_module = importlib.import_module('app.core.config')
    importlib.reload(config_module)
    session_module = importlib.import_module('app.db.session')
    importlib.reload(session_module)
    main_module = importlib.import_module('app.main')
    importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        reg = client.post('/api/auth/register', json={
            'email': 'reassign@example.com', 'password': '123456', 'full_name': 'Reassign User',
        })
        token = reg.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        client.post('/api/accounts', headers=headers, json={
            'name': 'Conta Corrente', 'bank': 'itau', 'account_type': 'Corrente',
            'card_types': ['Débito'], 'notes': '', 'credit_limit': 0, 'credit_used': 0,
            'close_day': None, 'due_day': None, 'balance': 1000,
        })

        client.post('/api/accounts', headers=headers, json={
            'name': 'Nubank', 'bank': 'nubank', 'account_type': 'Corrente',
            'card_types': ['Crédito'], 'notes': '', 'credit_limit': 2000, 'credit_used': 0,
            'close_day': 8, 'due_day': 15, 'balance': 0,
        })

        # Purchase on 2026-03-03 lands on the 2026-04 invoice (close 2026-03-08, due 2026-04-15)
        purchase = client.post('/api/transactions', headers=headers, json={
            'date': '2026-03-03', 'direction': 'Saída', 'amount': 300, 'method': 'Crédito',
            'account': 'Nubank', 'card': 'Nubank', 'kind': 'Normal',
            'category': 'Teste', 'subcategory': '', 'description': 'Compra 1', 'notes': '',
        })
        assert purchase.status_code == 200

        invoices_before = client.get('/api/invoices', headers=headers).json()
        assert len(invoices_before) == 1
        original_key = invoices_before[0]['invoice_key']
        assert original_key == 'Nubank|2026-04'
        assert invoices_before[0]['invoice_due_iso'] == '2026-04-15'

        # Also create a partial payment so that both purchases and payments are reassigned
        pay = client.post('/api/invoices/pay', headers=headers, json={
            'card': 'Nubank', 'invoice_key': original_key, 'amount': 50,
            'account': 'Conta Corrente', 'method': 'Pix',
        })
        assert pay.status_code == 200

        # Move the invoice to May/2026
        resp = client.post('/api/invoices/reassign', headers=headers, json={
            'invoice_key': original_key, 'target_month': '2026-05',
        })
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body['invoice_key'] == 'Nubank|2026-05'
        assert body['invoice_due_iso'] == '2026-05-15'
        assert body['invoice_close_iso'] == '2026-04-08'

        invoices_after = client.get('/api/invoices', headers=headers).json()
        keys = {inv['invoice_key'] for inv in invoices_after}
        assert 'Nubank|2026-05' in keys
        assert 'Nubank|2026-04' not in keys

        moved = next(inv for inv in invoices_after if inv['invoice_key'] == 'Nubank|2026-05')
        assert moved['purchases'] == 300
        assert moved['payments'] == 50
        assert moved['open'] == 250


def test_reassign_invoice_rejects_invalid_month(tmp_path, monkeypatch):
    db_path = tmp_path / 'invoice-reassign-bad.db'
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_path}')

    config_module = importlib.import_module('app.core.config')
    importlib.reload(config_module)
    session_module = importlib.import_module('app.db.session')
    importlib.reload(session_module)
    main_module = importlib.import_module('app.main')
    importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        reg = client.post('/api/auth/register', json={
            'email': 'reassign-bad@example.com', 'password': '123456', 'full_name': 'Bad',
        })
        token = reg.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        bad = client.post('/api/invoices/reassign', headers=headers, json={
            'invoice_key': 'Nubank|2026-04', 'target_month': '2026/05',
        })
        assert bad.status_code == 400

        missing = client.post('/api/invoices/reassign', headers=headers, json={
            'invoice_key': 'Nubank|2026-04', 'target_month': '2026-05',
        })
        assert missing.status_code == 404
