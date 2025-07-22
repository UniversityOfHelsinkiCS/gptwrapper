import { Box, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import type { FeedbackPost } from '../../../shared/feedback'

export default function Feedbacks() {
  const { data: feedbacks } = useQuery<
    Array<{ id: string; createdAt: string; updatedAt: string; user: { firstNames: string; lastName: string; primaryEmail: string } } & FeedbackPost>
  >({
    queryKey: ['/feedback'],
  })

  return (
    <Box>
      {feedbacks?.map((f) => (
        <Paper key={f.id} sx={{ p: 1, my: 4, display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              {f.user.firstNames} {f.user.lastName}, {f.user.primaryEmail}. {f.responseWanted ? 'Response wanted!' : ''}
            </Typography>
            <Typography variant="body1">{f.feedback}</Typography>
          </Box>
          <Table size="small" sx={{ flex: 1 }}>
            <TableBody>
              {Object.entries(f.metadata).map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell>{key}</TableCell>
                  <TableCell>{String(value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ))}
    </Box>
  )
}
