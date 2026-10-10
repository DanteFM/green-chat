import { hueFor, initials } from '../lib/format';

interface Props {
  id: string;
  title: string;
  size?: number;
}

export function Avatar({ id, title, size = 48 }: Props) {
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hueFor(id)} 62% 56%), hsl(${(hueFor(id) + 40) % 360} 62% 46%))`,
      }}
    >
      {initials(title)}
    </span>
  );
}
