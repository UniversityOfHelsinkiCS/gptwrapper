import { Modal, Box, IconButton } from '@mui/material'
import { Close } from '@mui/icons-material'
import Markdown from '../Banner/Markdown'

const mathGuideContent = `## Math Formatting Guide

Wrap math expressions with double dollar signs \`$$\` for display mode. Inline math with single dollar sign \`$\` is **not** supported.

## Aligning Equations

To align equations, use the aligned environment within \`$$...$$\`.
Use \`&\` for alignment points and \`\\\\\` for new lines.
(Note: align or align* environments are automatically converted to aligned.)

## Matrices

Create matrices using their respective environments within \`$$...$$\`:
- **pmatrix** (parentheses)
- **bmatrix** (brackets)
- **vmatrix** (vertical bars, for determinants)
- **Vmatrix** (double vertical bars, for norms)
- **matrix** (no delimiters)

## Chemical Formulas & Equations

- \`\\ce{...}\` for chemical equations/formulas.
- \`\\pu{...}\` for physical units.

## Supported macros

- \`\\abs{x}\` → |x|
- \`\\norm{v}\` → ||v||
- \`\\R\` → ℝ
- \`\\C\` → ℂ
- \`\\N\` → ℕ
- \`\\Z\` → ℤ
- \`\\vec{a}\` → **a**
- \`\\deriv{y}{x}\` → dy/dx
- \`\\pdv{f}{x}\` → ∂f/∂x
- \`\\set{S}\` → {S}
- \`\\lr{expr}\` → (expr)
- \`M\\T\` → M^T
- \`A \\defeq B\` → A := B
- \`\\epsilon_0\` → ε₀
- \`\\mu_0\` → μ₀
- \`\\div\` → div
- \`\\curl\` → curl
- \`\\grad\` → grad
- \`\\laplacian\` → ∇²
- \`\\dd{x}\` → dx
- \`\\pd{x}\` → ∂x
- \`\\vb{A}\` → **A**
- \`\\vu{e}\` → ê
- \`\\aprx\` → ≈
- \`\\bra{A}\` → ⟨A|
- \`\\ket{B}\` → |B⟩
- \`\\braket{A}{B}\` → ⟨A|B⟩
- \`\\oprod{A}{B}\` → |A⟩⟨B|
- \`\\slashed{A}\` → Ā`

export const MathGuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 600,
          width: '85vw',
          maxWidth: 1000,
          maxHeight: '80vh',
          bgcolor: 'background.paper',
          boxShadow: 24,
          borderRadius: '0.3rem',
          overflow: 'auto',
          padding: '3rem',
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 10,
            right: 20,
            color: 'grey.500',
          }}
        >
          <Close />
        </IconButton>

        <Markdown>{mathGuideContent}</Markdown>
      </Box>
    </Modal>
  )
}
