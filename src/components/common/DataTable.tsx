import React from 'react';
export const DataTable = (props: React.PropsWithChildren<object>) => <div className="DataTable">{props.children || 'DataTable'}</div>;