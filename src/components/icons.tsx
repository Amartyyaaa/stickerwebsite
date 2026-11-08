import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function make(paths: React.ReactNode, displayName: string) {
  function Icon({ size = 22, ...props }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        {paths}
      </svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}

export const MenuIcon = make(<path d="M4 7h16M4 12h16M4 17h16" />, 'MenuIcon');
export const SearchIcon = make(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
  'SearchIcon',
);
export const HeartIcon = make(<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />, 'HeartIcon');
export const UserIcon = make(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </>,
  'UserIcon',
);
export const BagIcon = make(
  <>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </>,
  'BagIcon',
);
export const ChevronIcon = make(<path d="m6 9 6 6 6-6" />, 'ChevronIcon');
export const CloseIcon = make(<path d="M6 6l12 12M18 6 6 18" />, 'CloseIcon');
export const PlusIcon = make(<path d="M12 5v14M5 12h14" />, 'PlusIcon');
export const MinusIcon = make(<path d="M5 12h14" />, 'MinusIcon');
export const CheckIcon = make(<path d="m5 12 4.5 4.5L19 7" />, 'CheckIcon');
export const ChatIcon = make(
  <>
    <path d="M4.5 19.5 5.8 15.4A8 8 0 1 1 8.6 18.3Z" />
    <path d="M9.2 9.3c.3 2.4 2.6 4.8 5.3 5.4" />
  </>,
  'ChatIcon',
);
export const HomeIcon = make(
  <>
    <path d="M4 11 12 4l8 7v9H4z" />
    <path d="M10 20v-5h4v5" />
  </>,
  'HomeIcon',
);
export const GridIcon = make(
  <>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </>,
  'GridIcon',
);
export const SparkleIcon = make(<path d="M12 3c.6 4.6 3.4 7.4 8 8-4.6.6-7.4 3.4-8 8-.6-4.6-3.4-7.4-8-8 4.6-.6 7.4-3.4 8-8Z" />, 'SparkleIcon');
export const UploadIcon = make(
  <>
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M5 20h14" />
  </>,
  'UploadIcon',
);
export const DownloadIcon = make(
  <>
    <path d="M12 4v12M7 11l5 5 5-5" />
    <path d="M5 20h14" />
  </>,
  'DownloadIcon',
);
export const DropIcon = make(<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />, 'DropIcon');
export const LayersIcon = make(
  <>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </>,
  'LayersIcon',
);
export const CardIcon = make(
  <>
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M3 10h18" />
  </>,
  'CardIcon',
);
export const TruckIcon = make(
  <>
    <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </>,
  'TruckIcon',
);
export const ArrowIcon = make(<path d="M5 12h14M13 6l6 6-6 6" />, 'ArrowIcon');
export const TrendIcon = make(
  <>
    <path d="m4 16 5-5 4 4 7-7" />
    <path d="M15 8h5v5" />
  </>,
  'TrendIcon',
);
export const FilterIcon = make(<path d="M4 6h16M7 12h10M10 18h4" />, 'FilterIcon');
export const TrashIcon = make(
  <>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </>,
  'TrashIcon',
);
export const ShareIcon = make(
  <>
    <circle cx="18" cy="5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="19" r="2.5" />
    <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" />
  </>,
  'ShareIcon',
);
export const PinIcon = make(
  <>
    <path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11Z" />
    <circle cx="12" cy="10" r="2.2" />
  </>,
  'PinIcon',
);
export const CropIcon = make(<path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2" />, 'CropIcon');
export const ImageIcon = make(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-5-5L5 21" />
  </>,
  'ImageIcon',
);
export const AlertIcon = make(
  <>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </>,
  'AlertIcon',
);
export const RefreshIcon = make(
  <>
    <path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" />
    <path d="M21 3v5h-5" />
  </>,
  'RefreshIcon',
);
