import { useState } from 'react'
import { alpha, Box, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Typography } from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { useTranslation } from 'react-i18next'

import type { UsageComparisonRow } from '@shared/usage'
import useUsageComparison from '../../../hooks/useUsageComparison'
import { ariaSort } from '../../../util/accessibility'

type SortKey = 'costPercent' | 'tokenPercent'
type Order = 'asc' | 'desc'

const isOverBudget = (row: UsageComparisonRow) => row.costPercent >= 100

const sortRows = (rows: UsageComparisonRow[], orderBy: SortKey, order: Order) =>
  [...rows].sort((a, b) => (order === 'asc' ? a[orderBy] - b[orderBy] : b[orderBy] - a[orderBy]))

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
  const { rows, isLoading } = useUsageComparison()
  const [orderBy, setOrderBy] = useState<SortKey>('costPercent')
  const [order, setOrder] = useState<Order>('desc')

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
  }

  return (
    <Box my={2}>
      <Typography sx={{ mb: 2 }}>{t('admin:usageComparisonInfo')}</Typography>
      {rows.length === 0 ? (
        <Typography>{t('admin:usageComparisonEmpty')}</Typography>
      ) : (
        <TableContainer component={Paper}>
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
              {sortRows(rows, orderBy, order).map((row) => {
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
      )}
    </Box>
  )
}

export default UsageComparisonTable
