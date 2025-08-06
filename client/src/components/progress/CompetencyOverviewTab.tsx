import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
  Alert
} from '@mui/material'

interface CompetencyRatingDetail {
  taskId: string
  taskName: string
  level: string
  source: string
  setAt: Date
  setByAdminName?: string
  notes?: string
}

interface CompetencyOverviewTabProps {
  competencyRatings: CompetencyRatingDetail[]
}

const getCompetencyColor = (level: string) => {
  switch (level) {
    case 'EXPERT': return '#2e7d32'
    case 'PROFICIENT': return '#388e3c'
    case 'COMPETENT': return '#4caf50'
    case 'ADVANCED_BEGINNER': return '#ff9800'
    case 'NOT_COMPETENT': return '#f44336'
    case 'NOT_ASSESSED': return '#9e9e9e'
    default: return '#9e9e9e'
  }
}

const getCompetencyLabel = (level: string) => {
  switch (level) {
    case 'EXPERT': return 'Expert'
    case 'PROFICIENT': return 'Proficient'
    case 'COMPETENT': return 'Competent'
    case 'ADVANCED_BEGINNER': return 'Advanced Beginner'
    case 'NOT_COMPETENT': return 'Not Competent'
    case 'NOT_ASSESSED': return 'Not Assessed'
    default: return level
  }
}

const CompetencyOverviewTab: React.FC<CompetencyOverviewTabProps> = ({
  competencyRatings
}) => {
  if (competencyRatings.length === 0) {
    return (
      <Alert severity="info">
        No competency ratings have been set for this carer yet.
      </Alert>
    )
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Task Name</TableCell>
            <TableCell align="center">Competency Level</TableCell>
            <TableCell align="center">Source</TableCell>
            <TableCell align="center">Set Date</TableCell>
            <TableCell>Set By</TableCell>
            <TableCell>Notes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {competencyRatings.map((rating, index) => (
            <TableRow key={index}>
              <TableCell>{rating.taskName}</TableCell>
              <TableCell align="center">
                <Chip
                  label={getCompetencyLabel(rating.level)}
                  size="small"
                  sx={{
                    backgroundColor: getCompetencyColor(rating.level),
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={rating.source}
                  size="small"
                  variant="outlined"
                  color={rating.source === 'MANUAL' ? 'primary' : 'default'}
                />
              </TableCell>
              <TableCell align="center">
                {new Date(rating.setAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {rating.setByAdminName || 'System'}
              </TableCell>
              <TableCell>
                {rating.notes || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default CompetencyOverviewTab