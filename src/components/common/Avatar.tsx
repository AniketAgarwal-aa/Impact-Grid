import React from 'react';
export const Avatar = (props: React.PropsWithChildren<object>) => <div className="Avatar">{props.children || 'Avatar'}</div>;