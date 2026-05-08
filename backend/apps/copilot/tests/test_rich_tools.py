from datetime import date, timedelta

from django.test import TestCase
from django.utils import timezone

from apps.campaigns.models import Campaign
from apps.copilot.tools import render_chart, show_campaign_cards, show_startup_cards
from apps.startups.models import Startup
from apps.users.models import UserProfile


def make_user(email, role="investor"):
    return UserProfile.objects.create(email=email, full_name="Test User", role=role)


def make_startup(created_by, name="Test Startup", industry="FinTech"):
    return Startup.objects.create(
        name=name,
        description="A test startup description",
        industry=industry,
        location="Paris",
        founding_date=date(2023, 1, 1),
        created_by=created_by,
    )


def make_campaign(startup, title="Test Campaign", status=Campaign.Status.ACTIVE):
    return Campaign.objects.create(
        startup=startup,
        title=title,
        description="A test campaign description",
        funding_goal="500000.00",
        equity_offered="10.00",
        deadline=timezone.now() + timedelta(days=30),
        status=status,
    )


class ShowStartupCardsTest(TestCase):
    def setUp(self):
        self.investor = make_user("investor@test.com")
        self.founder = make_user("founder@test.com", role="founder")
        self.startup = make_startup(self.founder)

    def test_returns_card_type_startup(self):
        result = show_startup_cards(self.investor, [self.startup.id])
        self.assertEqual(result["card_type"], "startup")
        self.assertEqual(len(result["items"]), 1)

    def test_item_has_required_fields(self):
        result = show_startup_cards(self.investor, [self.startup.id])
        item = result["items"][0]
        for field in ["id", "name", "description", "industry", "location", "status",
                      "logo_url", "members_count", "followers_count", "is_following",
                      "created_by", "founding_date", "website", "created_at", "updated_at"]:
            self.assertIn(field, item, f"Missing field: {field}")

    def test_max_six_cards(self):
        ids = [make_startup(self.founder, name=f"S{i}").id for i in range(8)]
        result = show_startup_cards(self.investor, ids)
        self.assertLessEqual(len(result["items"]), 6)

    def test_nonexistent_ids_skipped(self):
        result = show_startup_cards(self.investor, [99999])
        self.assertEqual(result["card_type"], "startup")
        self.assertEqual(result["items"], [])

    def test_is_following_false_by_default(self):
        result = show_startup_cards(self.investor, [self.startup.id])
        self.assertFalse(result["items"][0]["is_following"])


class ShowCampaignCardsTest(TestCase):
    def setUp(self):
        self.investor = make_user("investor2@test.com")
        founder = make_user("founder2@test.com", role="founder")
        startup = make_startup(founder)
        self.campaign = make_campaign(startup)

    def test_returns_card_type_campaign(self):
        result = show_campaign_cards(self.investor, [self.campaign.id])
        self.assertEqual(result["card_type"], "campaign")
        self.assertEqual(len(result["items"]), 1)

    def test_item_has_required_fields(self):
        result = show_campaign_cards(self.investor, [self.campaign.id])
        item = result["items"][0]
        for field in ["id", "title", "description", "startup", "startup_name",
                      "startup_logo_url", "startup_industry", "funding_goal",
                      "current_funding", "funding_percentage", "equity_offered",
                      "deadline", "status", "created_at", "updated_at"]:
            self.assertIn(field, item, f"Missing field: {field}")

    def test_max_six_cards(self):
        founder = make_user("founder3@test.com", role="founder")
        startup = make_startup(founder, name="Other")
        ids = [make_campaign(startup, title=f"C{i}").id for i in range(8)]
        result = show_campaign_cards(self.investor, ids)
        self.assertLessEqual(len(result["items"]), 6)

    def test_nonexistent_ids_skipped(self):
        result = show_campaign_cards(self.investor, [99999])
        self.assertEqual(result["card_type"], "campaign")
        self.assertEqual(result["items"], [])


class RenderChartTest(TestCase):
    def setUp(self):
        self.user = make_user("chartuser@test.com")

    def test_valid_bar_chart(self):
        result = render_chart(
            self.user, "bar", "Revenue",
            [{"label": "Jan", "value": 1000}, {"label": "Feb", "value": 2000}],
        )
        self.assertEqual(result["chart_type"], "bar")
        self.assertEqual(result["title"], "Revenue")
        self.assertEqual(len(result["data"]), 2)
        self.assertNotIn("error", result)

    def test_valid_pie_chart(self):
        result = render_chart(
            self.user, "pie", "Distribution",
            [{"name": "A", "value": 60}, {"name": "B", "value": 40}],
        )
        self.assertEqual(result["chart_type"], "pie")

    def test_invalid_chart_type_returns_error(self):
        result = render_chart(self.user, "scatter", "Title", [{"label": "A", "value": 1}])
        self.assertIn("error", result)

    def test_empty_data_returns_error(self):
        result = render_chart(self.user, "bar", "Title", [])
        self.assertIn("error", result)

    def test_optional_axis_labels_included(self):
        result = render_chart(
            self.user, "line", "Trend",
            [{"label": "Q1", "value": 100}],
            x_label="Quarter", y_label="Amount",
        )
        self.assertEqual(result["x_label"], "Quarter")
        self.assertEqual(result["y_label"], "Amount")

    def test_area_and_line_types_valid(self):
        for chart_type in ("line", "area"):
            result = render_chart(
                self.user, chart_type, "Chart",
                [{"label": "A", "value": 1}],
            )
            self.assertEqual(result["chart_type"], chart_type)
