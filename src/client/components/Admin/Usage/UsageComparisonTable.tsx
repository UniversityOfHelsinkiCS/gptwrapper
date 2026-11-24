import { useState } from 'react'
import {
  alpha,
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { useTranslation } from 'react-i18next'

import type { SortOrder, UsageComparisonRow, UsageComparisonSortKey } from '@shared/usage'
import useUsageComparison from '../../../hooks/useUsageComparison'
import { ariaSort } from '../../../util/accessibility'

type SortKey = UsageComparisonSortKey
type Order = SortOrder

const ROWS_PER_PAGE_OPTIONS = [25, 50, 100]

const isOverBudget = (row: UsageComparisonRow) => row.costPercent >= 100

const HeadCell = ({ children, align }: { children: React.ReactNode; align?: 'right' }) => (
  <TableCell align={align}>
    <Typography variant="h6" component="span">
      <b>{children}</b>
    </Typography>
  </TableCell>
)

const SortableHeadCell = ({
  id,
  label,
  orderBy,
  order,
  onSort,
}: {
  id: SortKey
  label: string
  orderBy: SortKey
  order: Order
  onSort: (id: SortKey) => void
}) => (
  <TableCell align="right" aria-sort={ariaSort(orderBy === id, order)}>
    <TableSortLabel active={orderBy === id} direction={orderBy === id ? order : 'desc'} onClick={() => onSort(id)}>
      <Typography variant="h6" component="span">
        <b>{label}</b>
      </Typography>
    </TableSortLabel>
  </TableCell>
)

const UsageComparisonTable = () => {
  const [orderBy, setOrderBy] = useState<SortKey>('costPercent')
  const [order, setOrder] = useState<Order>('desc')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const { rows, count, isLoading } = useUsageComparison({ orderBy, order, limit: rowsPerPage, offset: page * rowsPerPage })

  const { t, i18n } = useTranslation()
  const { language } = i18n

  if (isLoading || !rows) return null

  const euros = (amount: number) => new Intl.NumberFormat(language, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(amount)
  const tokens = (amount: number) => new Intl.NumberFormat(language).format(amount)
  const percent = (value: number) => `${Math.round(value)} %`

  const onSort = (key: SortKey) => {
    if (key === orderBy) {
      setOrder(order === 'asc' ? 'desc' : 'asc')
    } else {
      setOrderBy(key)
      setOrder('desc')
    }
    setPage(0)
  }

  return (
    <Box my={2}>
      <Typography sx={{ mb: 2 }}>{t('admin:usageComparisonInfo')}</Typography>
      {count === 0 ? (
        <Typography>{t('admin:usageComparisonEmpty')}</Typography>
      ) : (
        <Paper>
          <TableContainer>
            <Table aria-label={t('admin:usageComparison')}>
              <TableHead>
                <TableRow>
                  <HeadCell>{t('admin:username')}</HeadCell>
                  <HeadCell align="right">{t('admin:weeklyTokens')}</HeadCell>
                  <SortableHeadCell id="tokenPercent" label={t('admin:tokenPercent')} orderBy={orderBy} order={order} onSort={onSort} />
                  <HeadCell align="right">{t('admin:weeklyCost')}</HeadCell>
                  <SortableHeadCell id="costPercent" label={t('admin:costPercent')} orderBy={orderBy} order={order} onSort={onSort} />
                  <HeadCell>{t('admin:budgetComposition')}</HeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const overBudget = isOverBudget(row)
                  const name = [row.firstNames, row.lastName].filter(Boolean).join(' ')

                  return (
                    <TableRow key={row.userId} sx={overBudget ? { backgroundColor: (theme) => alpha(theme.palette.error.main, 0.1) } : undefined}>
                      <TableCell component="th" scope="row">
                        <Typography component="span" sx={{ display: 'block' }}>
                          {row.username}
                        </Typography>
                        {name && (
                          <Typography variant="body2" component="span" color="text.secondary">
                            {name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {tokens(row.tokenUsage)} / {tokens(row.tokenLimit)}
                      </TableCell>
                      <TableCell align="right">{percent(row.tokenPercent)}</TableCell>
                      <TableCell align="right">
                        {euros(row.cost)} / {euros(row.budget.limit)}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                          {overBudget && <Chip size="small" color="error" icon={<WarningAmberIcon />} label={t('admin:overBudget')} />}
                          <span>{percent(row.costPercent)}</span>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" component="span" sx={{ display: 'block' }}>
                          {t('admin:budgetBase', { amount: euros(row.budget.base) })}
                        </Typography>
                        {row.budget.bonuses.map((bonus) => (
                          <Typography key={bonus.courseId} variant="body2" component="span" sx={{ display: 'block' }}>
                            {t('admin:budgetBonus', { percent: bonus.percent, course: bonus.name[language] || bonus.name.en || bonus.courseId })}
                          </Typography>
                        ))}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            count={count ?? 0}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10))
              setPage(0)
            }}
            labelRowsPerPage={t('admin:rowsPerPage')}
          />
        </Paper>
      )}
    </Box>
  )
}

export default UsageComparisonTable
