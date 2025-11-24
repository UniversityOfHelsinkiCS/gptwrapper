import { CSSProperties } from 'react'

type CustomIconrops = {
    src: string
    size?: 'sm' | 'md' | 'lg'
    style?: CSSProperties
}

export const CustomIcon = ({ src, size = 'md', style }: CustomIconrops) => {
    const sizes: Record<'sm' | 'md' | 'lg', number> = {
        sm: 16,
        md: 20,
        lg: 24,
    }

    const px = sizes[size]

    return (
        <img
            src={src}
            style={{
                width: px,
                height: px,
                display: 'inline-block',
                ...style,
            }}
        />
    )
}
