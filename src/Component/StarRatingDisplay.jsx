import { Star } from 'lucide-react';
import PropTypes from 'prop-types';

const clampRating = (rating) => Math.min(5, Math.max(0, Number(rating) || 0));
const starValues = [1, 2, 3, 4, 5];

export const StarRatingDisplay = ({
  rating,
  sizeClass = 'h-5 w-5',
  gapClass = 'gap-1',
  justifyClass = 'justify-start',
  emptyClass = 'text-white/25',
  filledClass = 'fill-[#FF9500] text-[#FF9500]',
}) => {
  const normalizedRating = clampRating(rating);

  return (
    <div
      className={`flex ${gapClass} ${justifyClass}`}
      aria-label={`${normalizedRating} de 5 estrellas`}
      title={`${normalizedRating} de 5 estrellas`}
    >
      {starValues.map((starValue) => {
        const fillPercentage = Math.min(1, Math.max(0, normalizedRating - (starValue - 1))) * 100;

        return (
          <span key={starValue} className={`relative shrink-0 ${sizeClass}`} aria-hidden="true">
            <Star className={`absolute inset-0 h-full w-full ${emptyClass}`} />
            <Star
              className={`absolute inset-0 h-full w-full ${filledClass}`}
              style={{ clipPath: `inset(0 ${100 - fillPercentage}% 0 0)` }}
            />
          </span>
        );
      })}
    </div>
  );
};

StarRatingDisplay.propTypes = {
  rating: PropTypes.number.isRequired,
  sizeClass: PropTypes.string,
  gapClass: PropTypes.string,
  justifyClass: PropTypes.string,
  emptyClass: PropTypes.string,
  filledClass: PropTypes.string,
};

export default StarRatingDisplay;
