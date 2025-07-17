import { icons, type LucideProps } from 'lucide-react';
import { type Product } from '@/lib/types';

interface IconDisplayProps extends LucideProps {
  name?: Product['icon'];
}

const IconDisplay = ({ name, ...props }: IconDisplayProps) => {
  if (!name) {
    const FallbackIcon = icons['Package'];
    return <FallbackIcon {...props} />;
  }
  
  const LucideIcon = icons[name];

  if (!LucideIcon) {
    // Return a default icon or null if the icon name is invalid
    const FallbackIcon = icons['Package'];
    return <FallbackIcon {...props} />;
  }

  return <LucideIcon {...props} />;
};

export default IconDisplay;
