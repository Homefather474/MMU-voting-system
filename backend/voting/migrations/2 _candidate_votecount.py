from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('voting', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='candidate',
            name='vote_count',
            field=models.PositiveIntegerField(default=0),
        ),
    ]