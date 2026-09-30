import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Ellipsis,
  FileVideo,
  Folder,
  FolderOpen,
  Info,
  Layers2,
  Menu,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-react';

// Lucide is ISC-licensed. Keeping its use behind this adapter gives AdCut one
// consistent outline weight and avoids shipping Apple SF Symbol assets.
const icons = {
  alert: AlertCircle,
  arrowDown: ArrowDown,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  arrowUp: ArrowUp,
  check: Check,
  checkCircle: CheckCircle2,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  help: CircleHelp,
  clock: Clock3,
  download: Download,
  more: Ellipsis,
  video: FileVideo,
  folder: Folder,
  folderOpen: FolderOpen,
  info: Info,
  layers: Layers2,
  menu: Menu,
  pause: Pause,
  play: Play,
  plus: Plus,
  refresh: RefreshCw,
  restore: RotateCcw,
  search: Search,
  settings: Settings2,
  adjust: SlidersHorizontal,
  upload: Upload,
  close: X,
} as const;

export type AppIconName = keyof typeof icons;

export function AppIcon({
  name,
  size = 20,
  className,
}: {
  name: AppIconName;
  size?: number;
  className?: string;
}) {
  const Icon = icons[name];
  return (
    <Icon
      aria-hidden="true"
      focusable="false"
      size={size}
      strokeWidth={1.8}
      className={className}
    />
  );
}
