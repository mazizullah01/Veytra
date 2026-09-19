import AppLink from "./AppLink";
import Img from "./Img";
import { ArrowRightIcon } from "./Icons";

interface CategoryCardProps {
  href: string;
  title: string;
  image: string;
  blurb?: string;
  priority?: boolean;
}

export default function CategoryCard({
  href,
  title,
  image,
  blurb,
  priority = false,
}: CategoryCardProps) {
  return (
    <AppLink href={href} className="category-card">
      <span className="category-card__media">
        <Img
          src={image}
          alt={title}
          fill
          sizes="(max-width: 620px) 100vw, 50vw"
          priority={priority}
        />
      </span>
      <span className="category-card__scrim" />
      <span className="category-card__body">
        <span className="eyebrow eyebrow--light">
          {blurb ?? "Shop the edit"}
        </span>
        <span className="category-card__title">{title}</span>
        <span className="category-card__cta">
          Discover <ArrowRightIcon size={16} />
        </span>
      </span>
    </AppLink>
  );
}
