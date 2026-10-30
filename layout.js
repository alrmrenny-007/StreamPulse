import './globals.css';

export const metadata = {
  title: 'Film Archive',
  description: 'Stream public domain films from the Internet Archive',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
