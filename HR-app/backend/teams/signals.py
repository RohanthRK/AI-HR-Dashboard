from django.db.models.signals import post_save, post_delete, m2m_changed
from django.dispatch import receiver
from .models import Team, Project
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Team)
def team_saved(sender, instance, created, **kwargs):
    """
    Handle team creation and updates
    """
    if created:
        logger.info(f"New team created: {instance.name} in {instance.department}")
    else:
        logger.info(f"Team updated: {instance.name}")

@receiver(post_delete, sender=Team)
def team_deleted(sender, instance, **kwargs):
    """
    Handle team deletion
    """
    logger.info(f"Team deleted: {instance.name}")

@receiver(m2m_changed, sender=Team.members.through)
def team_members_changed(sender, instance, action, pk_set, **kwargs):
    """
    Log when team members are added or removed
    """
    if action == 'post_add':
        logger.info(f"Members added to team {instance.name}")
    elif action == 'post_remove':
        logger.info(f"Members removed from team {instance.name}")

@receiver(post_save, sender=Project)
def project_saved(sender, instance, created, **kwargs):
    """
    Handle project creation and updates
    """
    if created:
        logger.info(f"New project created: {instance.name} for team {instance.team.name}")
    else:
        logger.info(f"Project updated: {instance.name}")

@receiver(post_delete, sender=Project)
def project_deleted(sender, instance, **kwargs):
    """
    Handle project deletion
    """
    logger.info(f"Project deleted: {instance.name}") 