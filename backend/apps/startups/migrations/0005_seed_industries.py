from django.db import migrations

INDUSTRIES = [
    "AI / ML",
    "AgriTech",
    "Automotive",
    "Biotech",
    "CleanTech",
    "Cybersecurity",
    "E-Commerce",
    "EdTech",
    "Energy",
    "Enterprise Software",
    "FinTech",
    "FoodTech",
    "Gaming",
    "GovTech",
    "HealthTech",
    "HRTech",
    "InsurTech",
    "IoT",
    "LegalTech",
    "Logistics",
    "Manufacturing",
    "MarTech",
    "Media & Entertainment",
    "MedTech",
    "PropTech",
    "RetailTech",
    "Robotics",
    "SaaS",
    "Social Impact",
    "SpaceTech",
    "SportsTech",
    "Supply Chain",
    "TravelTech",
    "Web3 / Blockchain",
]


def seed_industries(apps, schema_editor):
    Industry = apps.get_model("startups", "Industry")
    for name in INDUSTRIES:
        Industry.objects.get_or_create(name=name)


def unseed_industries(apps, schema_editor):
    Industry = apps.get_model("startups", "Industry")
    Industry.objects.filter(name__in=INDUSTRIES).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("startups", "0004_add_industry_model"),
    ]

    operations = [
        migrations.RunPython(seed_industries, reverse_code=unseed_industries),
    ]
