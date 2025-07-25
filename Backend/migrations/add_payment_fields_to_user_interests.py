"""Add payment fields to user_interests table

Revision ID: add_payment_fields
Revises: 
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'add_payment_fields'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Add new columns to user_interests table
    op.add_column('user_interests', sa.Column('notification_sent_at', sa.DateTime(), nullable=True))
    op.add_column('user_interests', sa.Column('expired_notification_sent', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('user_interests', sa.Column('payment_transaction_id', sa.Integer(), nullable=True))
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_user_interests_payment_transaction',
        'user_interests', 
        'payment_transactions',
        ['payment_transaction_id'], 
        ['id']
    )

def downgrade():
    # Remove foreign key constraint
    op.drop_constraint('fk_user_interests_payment_transaction', 'user_interests', type_='foreignkey')
    
    # Remove columns
    op.drop_column('user_interests', 'payment_transaction_id')
    op.drop_column('user_interests', 'expired_notification_sent')
    op.drop_column('user_interests', 'notification_sent_at')