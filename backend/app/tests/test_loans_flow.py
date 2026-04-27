"""End-to-end tests for the loans router and planning integration."""

import importlib

from fastapi.testclient import TestClient


def _client(tmp_path, monkeypatch, db_name: str):
    db_path = tmp_path / db_name
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_path}')

    config_module = importlib.import_module('app.core.config')
    importlib.reload(config_module)
    session_module = importlib.import_module('app.db.session')
    importlib.reload(session_module)
    main_module = importlib.import_module('app.main')
    importlib.reload(main_module)
    return main_module


def _register(client: TestClient, email: str = 'loans@example.com'):
    reg = client.post(
        '/api/auth/register',
        json={'email': email, 'password': '123456', 'full_name': 'Loans User'},
    )
    token = reg.json()['access_token']
    return {'Authorization': f'Bearer {token}'}


def test_create_list_and_repay_loan(tmp_path, monkeypatch):
    main_module = _client(tmp_path, monkeypatch, 'loans-crud.db')
    with TestClient(main_module.app) as client:
        headers = _register(client)

        created = client.post(
            '/api/loans',
            headers=headers,
            json={
                'direction': 'taken',
                'counterparty': 'Banco X',
                'principal': 1000,
                'interest_rate': 0.02,
                'interest_mode': 'simple',
                'start_date': '2026-04-01',
                'due_date': '2026-07-01',
                'notes': 'Empréstimo para reforma',
            },
        )
        assert created.status_code == 200, created.text
        body = created.json()
        # Simple interest: 1000 * (1 + 0.02 * 3 months) = 1060
        assert body['expected_return'] == 1060.0
        assert body['interest_amount'] == 60.0
        assert body['outstanding'] == 1060.0
        assert body['status'] == 'active'

        listed = client.get('/api/loans', headers=headers).json()
        assert len(listed) == 1
        loan_id = listed[0]['id']

        repay = client.post(
            f'/api/loans/{loan_id}/repay',
            headers=headers,
            json={'amount': 500},
        )
        assert repay.status_code == 200, repay.text
        repaid_body = repay.json()
        assert repaid_body['repaid_amount'] == 500.0
        assert repaid_body['outstanding'] == 560.0
        assert repaid_body['status'] == 'partial'

        # Cannot overpay.
        excess = client.post(
            f'/api/loans/{loan_id}/repay',
            headers=headers,
            json={'amount': 10000},
        )
        assert excess.status_code == 400


def test_compound_interest_and_schedule(tmp_path, monkeypatch):
    main_module = _client(tmp_path, monkeypatch, 'loans-compound.db')
    with TestClient(main_module.app) as client:
        headers = _register(client, email='compound@example.com')

        created = client.post(
            '/api/loans',
            headers=headers,
            json={
                'direction': 'granted',
                'counterparty': 'Maria',
                'principal': 1000,
                'interest_rate': 0.05,
                'interest_mode': 'compound',
                'start_date': '2026-01-01',
                'due_date': '2026-04-01',
            },
        ).json()
        # Compound with per-period rounding should align with schedule.
        assert round(created['expected_return'], 2) == 1157.62

        schedule = client.get(
            f'/api/loans/{created["id"]}/schedule',
            headers=headers,
        ).json()
        assert len(schedule['rows']) == 4  # month 0 + 3 accruals
        assert schedule['rows'][0]['balance'] == 1000.0
        # Schedule rounds each period separately, so it can differ from the
        # closed-form expected_return by ≤1 cent due to banker's rounding.
        assert abs(schedule['rows'][-1]['balance'] - 1157.625) <= 0.02


def test_loan_appears_as_planning_event(tmp_path, monkeypatch):
    main_module = _client(tmp_path, monkeypatch, 'loans-planning.db')
    with TestClient(main_module.app) as client:
        headers = _register(client, email='planning@example.com')

        client.post(
            '/api/loans',
            headers=headers,
            json={
                'direction': 'taken',
                'counterparty': 'Banco Y',
                'principal': 500,
                'interest_rate': 0,
                'interest_mode': 'simple',
                'start_date': '2026-04-26',
                'due_date': '2026-05-15',
            },
        )

        # Run with default includeLoans=True, horizon covering due_date.
        result = client.post(
            '/api/planning/run',
            headers=headers,
            json={
                'startISO': '2026-04-26',
                'horizonMode': 'days30',
                'includeInvoices': False,
                'creditAsCash': False,
            },
        ).json()

        loan_events = [e for e in result['events'] if 'Empréstimo' in e['label']]
        assert len(loan_events) == 1
        assert loan_events[0]['date'] == '2026-05-15'
        assert loan_events[0]['out'] == 500.0
        assert loan_events[0]['forecast'] is True

        # Disabling the flag removes the event from the simulation.
        result_no_loans = client.post(
            '/api/planning/run',
            headers=headers,
            json={
                'startISO': '2026-04-26',
                'horizonMode': 'days30',
                'includeInvoices': False,
                'creditAsCash': False,
                'includeLoans': False,
            },
        ).json()
        assert not any(
            'Empréstimo' in e['label'] for e in result_no_loans['events']
        )


def test_granted_loan_becomes_inflow(tmp_path, monkeypatch):
    main_module = _client(tmp_path, monkeypatch, 'loans-granted.db')
    with TestClient(main_module.app) as client:
        headers = _register(client, email='granted@example.com')

        client.post(
            '/api/loans',
            headers=headers,
            json={
                'direction': 'granted',
                'counterparty': 'João',
                'principal': 200,
                'interest_rate': 0.01,
                'interest_mode': 'simple',
                'start_date': '2026-04-26',
                'due_date': '2026-05-26',
            },
        )

        result = client.post(
            '/api/planning/run',
            headers=headers,
            json={
                'startISO': '2026-04-26',
                'horizonMode': 'days60',
                'includeInvoices': False,
                'creditAsCash': False,
            },
        ).json()

        loan_events = [e for e in result['events'] if 'Empréstimo' in e['label']]
        assert len(loan_events) == 1
        # Simple interest: 200 * (1 + 0.01 * 1) = 202
        assert loan_events[0]['in'] == 202.0
        assert loan_events[0]['out'] == 0


def test_month_end_rollover_counts_full_month(tmp_path, monkeypatch):
    main_module = _client(tmp_path, monkeypatch, 'loans-month-end.db')
    with TestClient(main_module.app) as client:
        headers = _register(client, email='month-end@example.com')

        created = client.post(
            '/api/loans',
            headers=headers,
            json={
                'direction': 'taken',
                'counterparty': 'Banco Z',
                'principal': 1000,
                'interest_rate': 0.01,
                'interest_mode': 'simple',
                'start_date': '2026-01-31',
                'due_date': '2026-02-28',
            },
        )
        assert created.status_code == 200, created.text
        body = created.json()
        assert body['months'] == 1
        assert body['expected_return'] == 1010.0


def test_compound_expected_return_matches_schedule_balance(tmp_path, monkeypatch):
    main_module = _client(tmp_path, monkeypatch, 'loans-compound-rounding.db')
    with TestClient(main_module.app) as client:
        headers = _register(client, email='compound-rounding@example.com')

        created = client.post(
            '/api/loans',
            headers=headers,
            json={
                'direction': 'granted',
                'counterparty': 'Carlos',
                'principal': 100,
                'interest_rate': 0.05,
                'interest_mode': 'compound',
                'start_date': '2020-01-01',
                'due_date': '2030-01-01',
            },
        )
        assert created.status_code == 200, created.text
        body = created.json()

        schedule = client.get(
            f'/api/loans/{body["id"]}/schedule',
            headers=headers,
        )
        assert schedule.status_code == 200, schedule.text
        final_balance = schedule.json()['rows'][-1]['balance']
        assert body['expected_return'] == final_balance
