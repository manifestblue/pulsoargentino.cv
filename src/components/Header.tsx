interface HeaderProps {
  lastUpdated: string;
}

function Header({ lastUpdated }: HeaderProps) {
  const formattedDate = new Date(lastUpdated).toLocaleDateString('es-AR', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  });

  return (
    <header className="py-4 text-center">
      <h1 className="text-4xl font-bold text-text-primary">
        Pulso Argentino
      </h1>
      <p className="text-md text-text-secondary mt-1">
        Pronóstico de Trayectoria ARS/USD (H=5) — Última predicción generada el: {formattedDate}
      </p>
    </header>
  );
}

export default Header;