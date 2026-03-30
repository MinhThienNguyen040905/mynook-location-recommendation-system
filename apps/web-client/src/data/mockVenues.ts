// Mock Venue type (matches Vite prototype data shape).
// Separate from the backend Venue type in @/types/venue.ts which uses API field names.
export interface MockVenue {
  id: string;
  name: string;
  description: string;
  address: string;
  rating: number;
  reviewCount: number;
  priceLevel: number; // 1–4
  categories: string[];
  images: string[];
  features: string[]; // e.g. "Quiet", "Fast Wi-Fi", "Power Outlets"
  openingHours: string;
  coordinates: { lat: number; lng: number };
}

export const MOCK_VENUES: MockVenue[] = [
  {
    id: 'v1',
    name: 'The Quiet Corner',
    description:
      'A serene cafe designed specifically for deep work and focused study. Minimalist decor with plenty of natural light.',
    address: '123 Serenity Lane, District 1, HCMC',
    rating: 4.8,
    reviewCount: 124,
    priceLevel: 2,
    categories: ['Cafe', 'Study Space'],
    images: [
      'https://picsum.photos/seed/nook1/800/600',
      'https://picsum.photos/seed/nook1b/800/600',
      'https://picsum.photos/seed/nook1c/800/600',
    ],
    features: ['Quiet', 'Fast Wi-Fi', 'Ergonomic Chairs', 'Power Outlets'],
    openingHours: '08:00 - 22:00',
    coordinates: { lat: 10.7769, lng: 106.7009 },
  },
  {
    id: 'v2',
    name: 'Olive & Bean',
    description:
      'Artisanal coffee house with a cozy, rustic atmosphere. Perfect for reading or casual meetings.',
    address: '45 Rustic Road, District 3, HCMC',
    rating: 4.5,
    reviewCount: 89,
    priceLevel: 3,
    categories: ['Cafe', 'Bakery'],
    images: [
      'https://picsum.photos/seed/nook2/800/600',
      'https://picsum.photos/seed/nook2b/800/600',
    ],
    features: ['Outdoor Seating', 'Pet Friendly', 'Great Coffee'],
    openingHours: '07:00 - 21:00',
    coordinates: { lat: 10.7827, lng: 106.6881 },
  },
  {
    id: 'v3',
    name: 'The Library Loft',
    description:
      'A multi-level coworking space with a massive collection of books and private pods.',
    address: '88 Knowledge Blvd, District 7, HCMC',
    rating: 4.9,
    reviewCount: 210,
    priceLevel: 4,
    categories: ['Coworking', 'Library'],
    images: [
      'https://picsum.photos/seed/nook3/800/600',
      'https://picsum.photos/seed/nook3b/800/600',
    ],
    features: ['Private Pods', 'Meeting Rooms', 'Free Coffee', 'Printing'],
    openingHours: '24/7',
    coordinates: { lat: 10.7289, lng: 106.7082 },
  },
  {
    id: 'v4',
    name: 'Zen Garden Tea House',
    description:
      'Traditional tea house set in a lush garden. Extremely quiet and meditative.',
    address: '12 Garden Path, District 2, HCMC',
    rating: 4.7,
    reviewCount: 56,
    priceLevel: 3,
    categories: ['Tea House', 'Garden'],
    images: [
      'https://picsum.photos/seed/nook4/800/600',
      'https://picsum.photos/seed/nook4b/800/600',
    ],
    features: ['Garden View', 'Quiet', 'Traditional Tea', 'Shoes Off'],
    openingHours: '09:00 - 18:00',
    coordinates: { lat: 10.8018, lng: 106.7389 },
  },
  {
    id: 'v5',
    name: 'The Urban Attic',
    description:
      'A hidden gem in the heart of the city. Industrial chic with a focus on productivity and great espresso.',
    address: '202 Loft St, District 1, HCMC',
    rating: 4.6,
    reviewCount: 142,
    priceLevel: 2,
    categories: ['Cafe', 'Study Space'],
    images: [
      'https://picsum.photos/seed/nook5/800/600',
      'https://picsum.photos/seed/nook5b/800/600',
    ],
    features: ['Fast Wi-Fi', 'Power Outlets', 'Great Coffee', 'Industrial Decor'],
    openingHours: '07:30 - 23:00',
    coordinates: { lat: 10.7745, lng: 106.695 },
  },
  {
    id: 'v6',
    name: 'Paper & Pen',
    description:
      'A stationery-themed cafe that encourages writing and sketching. Very quiet with individual desks.',
    address: '15 Ink Lane, District 3, HCMC',
    rating: 4.8,
    reviewCount: 75,
    priceLevel: 2,
    categories: ['Cafe', 'Creative Space'],
    images: [
      'https://picsum.photos/seed/nook6/800/600',
      'https://picsum.photos/seed/nook6b/800/600',
    ],
    features: ['Quiet', 'Individual Desks', 'Stationery Shop', 'Good Lighting'],
    openingHours: '08:30 - 21:30',
    coordinates: { lat: 10.785, lng: 106.682 },
  },
  {
    id: 'v7',
    name: 'The Greenhouse',
    description:
      'A glass-walled workspace surrounded by plants. Feel like you are working in nature while staying in the city.',
    address: '55 Botanica Ave, District 2, HCMC',
    rating: 4.7,
    reviewCount: 112,
    priceLevel: 3,
    categories: ['Coworking', 'Garden'],
    images: [
      'https://picsum.photos/seed/nook7/800/600',
      'https://picsum.photos/seed/nook7b/800/600',
    ],
    features: ['Natural Light', 'Plant-filled', 'Fast Wi-Fi', 'Air Conditioned'],
    openingHours: '08:00 - 20:00',
    coordinates: { lat: 10.805, lng: 106.742 },
  },
  {
    id: 'v8',
    name: 'Midnight Brew',
    description:
      'The perfect spot for night owls. Dim lighting, jazz music, and strong coffee available until late.',
    address: '99 Nocturnal Way, District 1, HCMC',
    rating: 4.4,
    reviewCount: 198,
    priceLevel: 2,
    categories: ['Cafe', 'Late Night'],
    images: [
      'https://picsum.photos/seed/nook8/800/600',
      'https://picsum.photos/seed/nook8b/800/600',
    ],
    features: ['Late Night', 'Jazz Music', 'Dim Lighting', 'Comfy Sofas'],
    openingHours: '18:00 - 04:00',
    coordinates: { lat: 10.771, lng: 106.703 },
  },
];
