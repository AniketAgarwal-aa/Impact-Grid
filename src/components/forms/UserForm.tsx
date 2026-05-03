import React from 'react';
export const UserForm = (props: React.PropsWithChildren<object>) => <div className="UserForm">{props.children || 'UserForm'}</div>;