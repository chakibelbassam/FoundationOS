import { Link } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import HomeIcon from '@mui/icons-material/Home';

interface BreadcrumbsProps {
  path: string;
  leaf?: string;
  leafRoute?: string;
}

export function Breadcrumbs({ path, leaf, leafRoute }: BreadcrumbsProps) {
  const segments = path ? path.split('/').filter(Boolean) : [];
  return (
    <nav className="fo-location" aria-label="Breadcrumb">
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
        <HomeIcon fontSize="inherit" aria-hidden="true" />
        Home
      </Link>
      {segments.map((segment, index) => {
        const target = `/folder/${segments.slice(0, index + 1).map(encodeURIComponent).join('/')}`;
        const isLast = index === segments.length - 1 && !leaf;
        return (
          <span key={target} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <NavigateNextIcon fontSize="inherit" aria-hidden="true" />
            {isLast ? (
              <span aria-current="page">{segment}</span>
            ) : (
              <Link to={target} style={{ textDecoration: 'none' }}>{segment}</Link>
            )}
          </span>
        );
      })}
      {leaf ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <NavigateNextIcon fontSize="inherit" aria-hidden="true" />
          {leafRoute ? (
            <Link to={leafRoute} style={{ textDecoration: 'none' }}>{leaf}</Link>
          ) : (
            <span aria-current="page">{leaf}</span>
          )}
        </span>
      ) : null}
    </nav>
  );
}
