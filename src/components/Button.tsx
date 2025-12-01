import React from "react";

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, loading, ...rest }) => {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      style={{
        padding: "8px 16px",
        borderRadius: "4px",
        border: "none",
        backgroundColor: loading ? "#888" : "#1976d2",
        color: "#fff",
        cursor: loading ? "not-allowed" : "pointer",
        marginTop: "8px",
      }}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
};

export default Button;
