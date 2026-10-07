export interface PatchNote {
  date: string;
  title: string;
  status: 'upcoming' | 'released';
  summary: string;
  changes: string[];
}

export const patchNotes: PatchNote[] = [
  {
    date: 'October 7, 2026',
    title: 'Director profiles and filmographies',
    status: 'released',
    summary: 'Find out what your favorite directors have created, not just what they appear in.',
    changes: [
      'See directors alongside the main cast on movie and series pages.',
      'Open a director to browse the movies and series they directed.',
      'Search results show directing credits instead of acting appearances.',
    ],
  },
  {
    date: 'October 6, 2026',
    title: 'Ad-supported watch page',
    status: 'released',
    summary: 'The watch page now supports display ad placements on wide desktop screens.',
    changes: [
      'Ad placements appear in the watch page sidebars when configured.',
      'Unconfigured placements remain unobtrusive and do not block playback.',
    ],
  },
  {
    date: 'October 1, 2026',
    title: 'More playback sources',
    status: 'released',
    summary: 'We have added and refreshed playback source options for movies and series.',
    changes: [
      'Choose from the available sources in the player.',
      'The default source has been updated as playback options have changed.',
    ],
  },
  {
    date: 'September 30, 2026',
    title: 'Maintenance updates',
    status: 'released',
    summary: 'A scrolling banner can now let visitors know when site maintenance is underway.',
    changes: [
      'The banner stays visible below the main navigation.',
      'Hover over it to pause the scrolling message.',
    ],
  },
  {
    date: 'August 22, 2026',
    title: 'Find actors and their credits',
    status: 'released',
    summary: 'Search for actors by name and explore movies and series they have appeared in.',
    changes: [
      'Choose a person from search suggestions to open their credits.',
      'Actor results prioritize prominent roles.',
    ],
  },
  {
    date: 'June 19, 2026',
    title: 'More ways to browse',
    status: 'released',
    summary: 'Movie and series discovery gained additional filters and rating information.',
    changes: [
      'Filter titles by genre, including K-drama.',
      'IMDb ratings are available to help compare titles.',
    ],
  },
  {
    date: 'June 11, 2026',
    title: 'Cast profiles and people search',
    status: 'released',
    summary: 'Cast members are linked to their profiles, where you can explore their credits.',
    changes: [
      'Search supports people as well as movies and series.',
      'Person pages show profile details and related credits.',
    ],
  },
  {
    date: 'May 20, 2026',
    title: 'Keep browsing as you scroll',
    status: 'released',
    summary: 'Movie and series listings can load more titles as you browse.',
    changes: [
      'Infinite scrolling helps you continue through larger lists.',
      'Horizontal sections also support drag and momentum scrolling.',
    ],
  },
  {
    date: 'May 9, 2026',
    title: 'A smoother search and watchlist',
    status: 'released',
    summary: 'Search suggestions and the watchlist experience have been refined.',
    changes: [
      'Search suggestions include artwork and keyboard navigation.',
      'The navigation watchlist preview can scroll through more saved titles.',
    ],
  },
  {
    date: 'May 2, 2026',
    title: 'More to explore on the watch page',
    status: 'released',
    summary: 'Watch pages connect playback with cast, recommendations, and episode browsing.',
    changes: [
      'View cast members and recommended movies or series.',
      'Move between episodes with next and previous controls.',
    ],
  },
  {
    date: 'April 21, 2026',
    title: 'Main cast on movie and series pages',
    status: 'released',
    summary: 'See leading cast members on title pages and open their profiles.',
    changes: [
      'Cast cards show performer photos, names, and roles.',
      'Select a cast member to browse their other credits.',
    ],
  },
  {
    date: 'March 18, 2026',
    title: 'Easier horizontal browsing',
    status: 'released',
    summary: 'Carousel sections and watchlist previews are easier to navigate.',
    changes: [
      'Drag or swipe across horizontal title rows.',
      'Watchlist previews scroll and reveal more saved titles as needed.',
    ],
  },
  {
    date: 'March 15, 2026',
    title: 'Discovery filters and ratings',
    status: 'released',
    summary: 'Movies and series pages gained dedicated discovery filters and IMDb ratings.',
    changes: [
      'Narrow down titles with the discovery filter bar.',
      'Compare titles using IMDb rating information.',
    ],
  },
  {
    date: 'March 2, 2026',
    title: 'Watchlist preview in navigation',
    status: 'released',
    summary: 'Quickly see saved titles from the navigation without leaving your current page.',
    changes: [
      'Hover over Watchlist on desktop to preview saved titles.',
      'Open the full watchlist whenever you are ready.',
    ],
  },
  {
    date: 'February 24, 2026',
    title: 'Watchlist and page-loading improvements',
    status: 'released',
    summary: 'A dedicated watchlist and clearer loading states make the app easier to use.',
    changes: [
      'Keep track of titles on the watchlist page.',
      'See recommendations on the watch page.',
      'Content placeholders keep page layouts steady while titles load.',
      'Use the back-to-top button on longer pages.',
    ],
  },
  {
    date: 'February 8, 2026',
    title: 'Clearer episode playback',
    status: 'released',
    summary: 'The watch page makes it easier to tell which TV episode is currently playing.',
    changes: [
      'The current episode is highlighted in the episode list.',
      'A now-playing label displays the selected season and episode.',
    ],
  },
  {
    date: 'January 11, 2026',
    title: 'Mobile navigation and episode controls',
    status: 'released',
    summary: 'Navigation and playback controls have been improved for smaller screens and TV series.',
    changes: [
      'Use the responsive mobile menu and search.',
      'Navigate to the previous or next episode from the watch page.',
      'The app received Tinywatch branding for its mobile configuration.',
    ],
  },
  {
    date: 'January 1, 2026',
    title: 'Mobile app foundations',
    status: 'released',
    summary: 'The project gained Android app build support and visual refinements for mobile WebViews.',
    changes: [
      'Capacitor configuration and a mobile build command are available.',
      'Gradient styles were adjusted for more consistent Android WebView rendering.',
    ],
  },
  {
    date: 'December 2025',
    title: 'Playback and browsing refinements',
    status: 'released',
    summary: 'A series of updates improved browsing, playback, and page presentation.',
    changes: [
      'Drag-to-scroll works across horizontal content sections.',
      'Playback sources and player layouts were refined.',
      'Page titles and metadata were improved for TinyBros sections.',
      'Search and navigation layouts received mobile and usability improvements.',
    ],
  },
  {
    date: 'Earlier releases',
    title: 'The TinyBros streaming experience',
    status: 'released',
    summary: 'The core site grew from a streaming page into a catalog for movies, series, and anime.',
    changes: [
      'Browse trending titles and dedicated movie, series, and anime sections.',
      'Search the catalog and open title detail pages.',
      'Watch movies and episodes with selectable playback sources.',
      'Use the hero carousel, comments, and other site-wide experience improvements.',
    ],
  },
];
