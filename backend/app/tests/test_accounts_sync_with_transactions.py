"""End-to-end tests that verify the Accounts page data stays in sync
with the Transactions page, covering the scenario described by the user:

- Debit operations (Pix, Transferência, Débito) add/remove from the balance
- Credit purchases consume the credit limit (credit_used rises,
  credit_available drops) but leave the debit balance untouched
- Reversing a transaction (delete) reverses the account-side changes
"""
import importlib

from fastapi.testclient import TestClient


def _bootstrap_app(tmp_path, monkeypatch, db_name: str):
    db_path = tmp_path / db_name
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_path}')

    config_module = importlib.import_module('app.core.config')
    importlib.reload(config_module)
    session_module = importlib.import_module('app.db.session')
    importlib.reload(session_module)
    main_module = importlib.import_module('app.main')
    importlib.reload(main_module)
    return main_module.app


def _register(client, email='sync@example.com'):
    reg = client.post('/api/auth/register', json={
        'email': email, 'password': '123456', 'full_name': 'Sync User',
    })
    token = reg.json()['access_token']
    return {'Authorization': f'Bearer {token}'}


def _find(accounts, name):
    return next(a for a in accounts if a['name'] == name)


def test_full_sync_debit_and_credit_flow(tmp_path, monkeypatch):
    app = _bootstrap_app(tmp_path, monkeypatch, 'sync-full.db')
    with TestClient(app) as client:
        headers = _register(client)

        # Account with both debit and credit enabled (the user's scenario)
        acc = client.post('/api/accounts', headers=headers, json={
            'name': 'Nubank',
            'bank': 'nubank',
            'account_type': 'Corrente',
            'card_types': ['Débito', 'Crédito'],
            'notes': '',
            'credit_limit': 2000,
            'credit_used': 0,
            'close_day': 8,
            'due_day': 15,
            'balance': 0,
        })
        assert acc.status_code == 200
        account_id = acc.json()['id']

        # 1) Pix entrada: balance should become 500
        tx1 = client.post('/api/transactions', headers=headers, json={
            'date': '2026-03-03', 'direction': 'Entrada', 'amount': 500,
            'method': 'Pix', 'account': 'Nubank', 'account_id': account_id,
            'card': '', 'kind': 'Normal', 'category': 'Salário',
            'subcategory': '', 'description': 'Pix recebido', 'notes': '',
        })
        assert tx1.status_code == 200
        state = _find(client.get('/api/accounts', headers=headers).json(), 'Nubank')
        assert state['balance'] == 500
        assert state['credit_used'] == 0
        assert state['credit_available'] == 2000

        # 2) Transferência saída: balance should drop to 300
        tx2 = client.post('/api/transactions', headers=headers, json={
            'date': '2026-03-04', 'direction': 'Saída', 'amount': 200,
            'method': 'Transferência', 'account': 'Nubank', 'account_id': account_id,
            'card': '', 'kind': 'Normal', 'category': 'Aluguel',
            'subcategory': '', 'description': 'TED pago', 'notes': '',
        })
        assert tx2.status_code == 200
        state = _find(client.get('/api/accounts', headers=headers).json(), 'Nubank')
        assert state['balance'] == 300
        assert state['credit_used'] == 0

        # 3) Débito saída: balance should drop to 250
        tx3 = client.post('/api/transactions', headers=headers, json={
            'date': '2026-03-05', 'direction': 'Saída', 'amount': 50,
            'method': 'Débito', 'account': 'Nubank', 'account_id': account_id,
            'card': '', 'kind': 'Normal', 'category': 'Mercado',
            'subcategory': '', 'description': 'Compra no débito', 'notes': '',
        })
        assert tx3.status_code == 200
        state = _find(client.get('/api/accounts', headers=headers).json(), 'Nubank')
        assert state['balance'] == 250

        # 4) Crédito saída: credit_used becomes 400, balance stays 250
        tx4 = client.post('/api/transactions', headers=headers, json={
            'date': '2026-03-06', 'direction': 'Saída', 'amount': 400,
            'method': 'Crédito', 'account': 'Nubank', 'account_id': account_id,
            'card': 'Nubank', 'card_account_id': account_id, 'kind': 'Normal',
            'category': 'Compras', 'subcategory': '',
            'description': 'Compra no crédito', 'notes': '',
        })
        assert tx4.status_code == 200
        state = _find(client.get('/api/accounts', headers=headers).json(), 'Nubank')
        assert state['balance'] == 250  # credit purchase must NOT change debit balance
        assert state['credit_used'] == 400
        assert state['credit_available'] == 1600

        # 5) Delete the credit purchase: credit_used should return to 0
        rm = client.delete(f"/api/transactions/{tx4.json()['id']}", headers=headers)
        assert rm.status_code == 200
        state = _find(client.get('/api/accounts', headers=headers).json(), 'Nubank')
        assert state['balance'] == 250
        assert state['credit_used'] == 0
        assert state['credit_available'] == 2000

        # 6) Delete the Pix entry: balance should drop by 500 → -250
        rm = client.delete(f"/api/transactions/{tx1.json()['id']}", headers=headers)
        assert rm.status_code == 200
        state = _find(client.get('/api/accounts', headers=headers).json(), 'Nubank')
        assert state['balance'] == -250


def test_sync_across_multiple_accounts(tmp_path, monkeypatch):
    """Verify that transactions only touch the account they reference,
    not other accounts owned by the same user."""
    app = _bootstrap_app(tmp_path, monkeypatch, 'sync-multi.db')
    with TestClient(app) as client:
        headers = _register(client, email='multi@example.com')

        bradesco = client.post('/api/accounts', headers=headers, json={
            'name': 'Bradesco', 'bank': 'bradesco', 'account_type': 'Corrente',
            'card_types': ['Débito'], 'notes': '', 'credit_limit': 0,
            'credit_used': 0, 'close_day': None, 'due_day': None, 'balance': 0,
        }).json()

        nubank = client.post('/api/accounts', headers=headers, json={
            'name': 'Nubank', 'bank': 'nubank', 'account_type': 'Corrente',
            'card_types': ['Crédito'], 'notes': '', 'credit_limit': 1500,
            'credit_used': 0, 'close_day': 8, 'due_day': 15, 'balance': 0,
        }).json()

        # Deposit on Bradesco, credit purchase on Nubank.
        client.post('/api/transactions', headers=headers, json={
            'date': '2026-03-03', 'direction': 'Entrada', 'amount': 1000,
            'method': 'Pix', 'account': 'Bradesco', 'account_id': bradesco['id'],
            'card': '', 'kind': 'Normal', 'category': 'Salário',
            'subcategory': '', 'description': 'Salário', 'notes': '',
        })
        client.post('/api/transactions', headers=headers, json={
            'date': '2026-03-04', 'direction': 'Saída', 'amount': 250,
            'method': 'Crédito', 'account': 'Nubank', 'account_id': nubank['id'],
            'card': 'Nubank', 'card_account_id': nubank['id'], 'kind': 'Normal',
            'category': 'Compras', 'subcategory': '',
            'description': 'Compra crédito', 'notes': '',
        })

        listed = client.get('/api/accounts', headers=headers).json()
        by_name = {a['name']: a for a in listed}

        assert by_name['Bradesco']['balance'] == 1000
        assert by_name['Bradesco']['credit_used'] == 0
        assert by_name['Nubank']['balance'] == 0
        assert by_name['Nubank']['credit_used'] == 250
        assert by_name['Nubank']['credit_available'] == 1250
