import importlib

from fastapi.testclient import TestClient


def test_invoice_payment_updates_balance_and_credit_used(tmp_path, monkeypatch):
    db_path = tmp_path / 'invoice-pay.db'
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_path}')

    config_module = importlib.import_module('app.core.config')
    importlib.reload(config_module)
    session_module = importlib.import_module('app.db.session')
    importlib.reload(session_module)
    main_module = importlib.import_module('app.main')
    importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        reg = client.post('/api/auth/register', json={'email': 'invoice@example.com', 'password': '123456', 'full_name': 'Invoice User'})
        token = reg.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        debit_acc = client.post('/api/accounts', headers=headers, json={
            'name': 'Conta Corrente',
            'bank': 'itau',
            'account_type': 'Corrente',
            'card_types': ['Débito'],
            'notes': '',
            'credit_limit': 0,
            'credit_used': 0,
            'close_day': None,
            'due_day': None,
            'balance': 1000,
        })
        assert debit_acc.status_code == 200

        credit_acc = client.post('/api/accounts', headers=headers, json={
            'name': 'Nubank',
            'bank': 'nubank',
            'account_type': 'Corrente',
            'card_types': ['Crédito'],
            'notes': '',
            'credit_limit': 1200,
            'credit_used': 0,
            'close_day': 8,
            'due_day': 15,
            'balance': 0,
        })
        assert credit_acc.status_code == 200

        purchase = client.post('/api/transactions', headers=headers, json={
            'date': '2026-03-03',
            'direction': 'Saída',
            'amount': 300,
            'method': 'Crédito',
            'account': 'Nubank',
            'card': 'Nubank',
            'kind': 'Normal',
            'category': 'Teste',
            'subcategory': '',
            'description': 'Compra crédito',
            'notes': '',
        })
        assert purchase.status_code == 200

        invoices = client.get('/api/invoices', headers=headers)
        assert invoices.status_code == 200
        inv = invoices.json()[0]

        pay = client.post('/api/invoices/pay', headers=headers, json={
            'card': 'Nubank',
            'invoice_key': inv['invoice_key'],
            'amount': 200,
            'account': 'Conta Corrente',
            'method': 'Pix',
        })
        assert pay.status_code == 200

        listed = client.get('/api/accounts', headers=headers).json()
        by_name = {a['name']: a for a in listed}

        assert by_name['Conta Corrente']['balance'] == 800
        assert by_name['Nubank']['credit_used'] == 100
        assert by_name['Nubank']['credit_available'] == 1100
