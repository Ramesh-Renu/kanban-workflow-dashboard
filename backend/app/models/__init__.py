"""All tables. Import from here: `from app.models import User, Board, Ticket, ...`.

Module map (Orion schema → Kanban module):
    core       users, master (lookups), board (workspaces/boards/stages), permissions
    org        departments, locations, languages, shifts, reporting lines
    workflow   board.flow, stage templates/transitions, SLAs, workspace config
    catalog    master.tool* and product lookups
    tickets    customers.*, tickets.* (orders, subtasks, logs, comments)
    branding   tickets.ticket_customer_branding*
    knowledge  knowledgebase.*
    messaging  notifications, mail, attachments, agencies, logs
"""

from app.models.branding import *  # noqa: F403
from app.models.catalog import *  # noqa: F403
from app.models.core import *  # noqa: F403
from app.models.knowledge import *  # noqa: F403
from app.models.messaging import *  # noqa: F403
from app.models.org import *  # noqa: F403
from app.models.tickets import *  # noqa: F403
from app.models.workflow import *  # noqa: F403
