import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Flight Tracker',
    short_name: 'Flights',
    description: 'Every flight over India, live. Airport boards and fares too.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B1222',
    theme_color: '#0B1222',
    icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png' }],
  };
}
