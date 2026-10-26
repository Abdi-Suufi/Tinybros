export interface PatchNote {
  date: string;
  title: string;
  status: 'upcoming' | 'released';
  summary: string;
  changes: string[];
  image?: {
    src: string;
    alt: string;
  };
}

export const patchNotes: PatchNote[] = [
  {
    date: 'October 26, 2026',
    title: 'A fresh coat of gold',
    status: 'released',
    summary: 'Tinywatch has a semi-new look: a cleaner black-and-gold design across the site, a new navigation bar, and a much faster way to search.',
    changes: [
      'A new floating navigation bar with Home, Movies, Shows, and Anime, plus quick access to search and your account.',
      'Search grows right out of the navigation bar and shows results as you type, with All, Movies, Shows, and Anime tabs. Press “/” or Ctrl+K to open it.',
      'The homepage now has a Top Trending row, and posters everywhere show the rating, year, and type at a glance.',
      'Episodes and cast now sit side by side in their own scrollable panels, so long seasons no longer stretch the page.',
      'Playback sources are now a single dropdown under the player, and comments have moved up so they are easier to find.',
      'Continue watching now only shows the latest episode you watched for each series.',
      'Fixed a bug where the episode list could show the wrong season.',
    ],
  },
  {
    date: 'October 23, 2026',
    title: 'More ways to watch',
    status: 'released',
    summary: 'The watch page now offers more playback sources, with the main player and VidZee easy to find at the start of the selector.',
    changes: [
      'Choose from Main player, VidZee, VidStuck, Vidy, Videasy, and VidCore.',
      'Main player and VidZee do not show popup ads.',
      'Sources marked “(ads)” may show ads from their provider.',
    ],
  },
  {
    date: 'October 19, 2026',
    title: 'Your watchlist now syncs across devices',
    status: 'released',
    summary: 'Sign in to keep your Tinywatch watchlist in sync between the website and desktop app.',
    changes: [
      'Create an account or sign in with your email and password to sync saved movies and shows.',
      'Your existing device watchlist is merged into your account the first time you sign in.',
      'Forgot your password? Request a reset link by email and set a new password securely.',
      'Keep using a local-only watchlist when you are signed out.',
    ],
    image: {
      src: '/patch-notes/watchlist-sync.png',
      alt: 'Tinywatch cross-device watchlist update preview',
    },
  },
  {
    date: 'October 19, 2026',
    title: 'The new Tinywatch app is here',
    status: 'released',
    summary: 'Tinywatch is now available as a dedicated app experience, bringing a faster, more native way to browse and watch your favorite content on the go.',
    changes: [
      'Browse titles, jump back into your watchlist, and keep streaming with a more app-like interface.',
      'The web experience is still available for anyone who prefers using the browser version.',
    ],
  },
  {
    date: 'October 18, 2026',
    title: 'A new Tinywatch loading splash',
    status: 'released',
    summary: 'The homepage now opens with a black screen and an illuminated Tinywatch wordmark while its content loads.',
    changes: [
      'A warm light traces the outline of the Tinywatch wordmark. Pretty cool, right?',
    ],
    image: {
      src: 'https://i.pinimg.com/1200x/7f/bc/7e/7fbc7eb59f2da48745817afe69b204d6.jpg',
      alt: 'Tinywatch loading splash update',
    },
  },
  {
    date: 'October 17, 2026',
    title: 'Sidebar banners are live',
    status: 'released',
    summary: 'Banner ads are back in the watch page sidebars, separate from playback.',
    changes: [
      'Banner placements are live in the watch page sidebars on wide screens.',
      'Ads stay separate from the player and do not interrupt playback.',
      'Third-party playback providers may have their own ads, which are outside Tinywatch’s control.',
    ],
  },
  {
    date: 'October 16, 2026',
    title: 'Main player has no ads!',
    status: 'released',
    summary: 'The main player is ad freeeeeee. lowkey whitelist the site from your adblocker if you want to support it, but it’s not necessary to enjoy the content.',
    changes: [
      'Enjoy ad-free playback with the main player.',
      'Whitelist Tinywatch if you want to support the site; it is not required to enjoy the content.',
    ],
    image: {
      src: 'https://i.pinimg.com/originals/08/b8/ec/08b8ec3667f4dd3ba85211f303f5fc27.jpg',
      alt: 'Main player playback update',
    },
  },
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
      'Page titles and metadata were improved for Tinywatch sections.',
      'Search and navigation layouts received mobile and usability improvements.',
    ],
  },
  {
    date: 'Earlier releases',
    title: 'The Tinywatch streaming experience',
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
