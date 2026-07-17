from django.db import migrations


def make_all_eligible(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.filter(is_eligible=False).update(is_eligible=True)


def reverse_noop(apps, schema_editor):
    pass  # no-op: don't revert eligibility on migration rollback


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_alter_is_eligible_default'),
    ]

    operations = [
        migrations.RunPython(make_all_eligible, reverse_noop),
    ]