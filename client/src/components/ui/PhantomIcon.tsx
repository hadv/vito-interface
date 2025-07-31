import React from 'react';
import './PhantomIcon.css';

interface PhantomIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const PhantomIcon: React.FC<PhantomIconProps> = ({
  size = 32,
  className = '',
  style = {}
}) => {
  // Official Phantom wallet icon as base64 - no gradient conflicts!
  const phantomIconBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAA3pJREFUaIHtmVFuGkkQQF81IO1KiY1vMDlB1icInCCxtEbar/WcIOEEmBtkT9DsVxJjacgJwp4g+HO/wg2MwRLSmpnaD8AeBoYM0DhY4X3NdPV0V1XXTHXXwJ49Pzfy2BMGVov/MSgZkVeq6gnqKRRjCvVAeoh0UD6f+s/by8Z7FAMCq8UR/TOQ10BplWcFuhHUK/5BI0W+PZp2UEJ4LapncS+vg0A3R6F84v/aTbS7J7BDb8SdXdXbGegpplzxn3WmDU4NGIfKbQ30nctxE/TyFI6nK2Fcjdq0g1LI4OuWlQcoTlYXXKzAI3l9DgW/4h80NlqBwA69R/L6HAJ/sskKNO2gJGiw6ddlE5TwOLfOg5f29i3oR+AX92plR5B/Vw6hph3UlOj9ZlNrD7Sap/BCwR9n35gU7QqcKOZ4kfyhH6X8qsqDnm+mPChSjWXWxoXtI2Afekj9d/+gNbnpNO2NB1JLjmOQl5lXwJXyAMltQYGwtUyeT1lxhWImA1wqv4gT/+g+RAS6y+QJvm/AJ9t/41r5wF57s/fD+3sFL7DXxVn57W9pYy01ILBDLzcTm24YkX8bvw/lrpaQ12bl0Uz/OKl5ILBaDBl8VfDS+mxIG/QfkFeLNn0KLUGv0uRMwi3VgMtG36py5lprpwjthSF0YftnO688oKpXcwYEdugZmPvm7ibSmTMglLvaFuPeMWFn5h2YnKS+/TiFsqNot+IfvphZgfhBYdcxSJt4Hri0/TdbOMNuDUX+Jm6AQmqy2DUU7U7rRYaHVP5kvA9Sn14ZFqTyXWb88j7sVs2k9Ul6H0CadlAC/fLjFMrO9NMZbzMQPRHvay8kKidbzWS352QCN+OkUv/DP5o77BgQV2WRz+s9ptUMfeqn/uHCY6UBTT3tZEWgIUgrQ9ekYlVB5rya6FM/9Q9TT4Qb10YV7eYIq9HKBa6xV3OEbUXnjBi3SXmZ8gArlVUWTRISlSv+US+wt50RUdYnq9OQOPGPeh/sdTmHeWdEDiPVG8G0Kv7B0j8zU+TC9r/JGtvnqfLxF6tp+1+WZfRxwcr43/tttArGoCu/fIuUBxgR+enhoPUC0bFL5VknkSn6V4HofEmtZlr4LUZQLFBoJ38LuUTGE96cLyrdJXq2Uam79uCm3J/IPthrL485R3ipOv6iiEhXVa8E09o1xffs2TPmf1vhhyGadgBRAAAAAElFTkSuQmCC";

  return (
    <div
      className={`phantom-icon ${className}`}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        ...style
      }}
    >
      <img
        src={phantomIconBase64}
        alt="Phantom Wallet"
        width={size}
        height={size}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};

export default PhantomIcon;
