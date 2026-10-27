import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';

/**
 * Renders a chart at the width of its container. The chart is only mounted once the container has a usable width,
 * which avoids charting libraries logging "negative width" errors while a page is still laying out (notably on phones).
 * `children` is a function receiving the measured width.
 */
const MeasuredChart = ({ height, minWidth = 120, children }) => {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setWidth(Math.floor(el.getBoundingClientRect().width));
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Box ref={ref} sx={{ width: '100%', height, minWidth: 0 }}>
      {width >= minWidth ? children(width) : null}
    </Box>
  );
};

export default MeasuredChart;
