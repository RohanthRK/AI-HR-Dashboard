import React from 'react';
import EventIcon from '@mui/icons-material/Event';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import GroupsIcon from '@mui/icons-material/Groups';
import SchoolIcon from '@mui/icons-material/School';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PaymentsIcon from '@mui/icons-material/Payments';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WorkIcon from '@mui/icons-material/Work';
import InfoIcon from '@mui/icons-material/Info';

export const CATEGORIES = ['Leave', 'Expenses', 'Helpdesk', 'People', 'Learning', 'Compliance', 'Payroll', 'Performance', 'Hiring', 'System'];

const ICONS = {
  Leave: <EventIcon />, Expenses: <ReceiptLongIcon />, Helpdesk: <SupportAgentIcon />, People: <GroupsIcon />, Learning: <SchoolIcon />,
  Compliance: <VerifiedUserIcon />, Payroll: <PaymentsIcon />, Performance: <AssessmentIcon />, Hiring: <WorkIcon />, System: <InfoIcon />,
};

export const categoryIcon = (category) => ICONS[category] || ICONS.System;
