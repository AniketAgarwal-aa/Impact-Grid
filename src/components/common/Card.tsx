import React from 'react';
export const Card = (props: React.PropsWithChildren<object>) => <div className="Card">{props.children || 'Card'}</div>;