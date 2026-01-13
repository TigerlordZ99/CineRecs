import './globals.css'

export const metadata = {
  title: 'CineRecs',
  description: 'Find new movies to watch! If you have a letterboxd you can use that data, otherwise click to get started!',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}