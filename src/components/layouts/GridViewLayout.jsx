import React from "react";

/**
 * GridViewLayout - A reusable grid layout for displaying a list of items with a custom component.
 * @param {Array} data - The array of items to render.
 * @param {React.ComponentType} Component - The component to render for each item.
 * @param {Object} componentProps - Additional props to pass to each component (optional).
 * @param {string} gridClassName - Additional className for the grid container (optional).
 * @param {Object} style - Additional style for the grid container (optional).
 * @param {number} minColumnWidth - When set, the grid uses
 *        `repeat(auto-fill, minmax(<minColumnWidth>px, 1fr))` instead of the
 *        fixed responsive column counts — this is what the manager card-size
 *        slider drives.
 */
const GridViewLayout = ({
  data = [],
  Component,
  componentProps = {},
  gridClassName = '',
  style = {},
  minColumnWidth = null,
}) => {
  const width = Number(minColumnWidth);
  const useFluid = Number.isFinite(width) && width > 0;

  return (
    <div
      className={
        useFluid ? `grid gap-6 ${gridClassName}` : `grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${gridClassName}`
      }
      style={
        useFluid
          ? {
              gridTemplateColumns: `repeat(auto-fill, minmax(${Math.round(width)}px, 1fr))`,
              ...style,
            }
          : style
      }
    >
      {data.map((item, idx) => (
        <Component key={item._id || idx} item={item} orderNumber={item.order} {...componentProps} />
      ))}
    </div>
  );
};

export default GridViewLayout; 