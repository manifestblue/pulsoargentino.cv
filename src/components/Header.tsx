// Define la estructura de las props que el componente recibirá
interface HeaderProps {
  lastUpdated: string;
}

// El componente funcional del Header
function Header({ lastUpdated }: HeaderProps) {
  // Formatea la fecha para que sea más legible
  const formattedDate = new Date(lastUpdated).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC' // Importante para evitar desajustes de un día
  });

  return (
    <header className="py-4 text-center">
      <h1 className="text-4xl font-bold text-primary">
        Pulso Argentino
      </h1>
      <p className="text-md text-text-secondary mt-1">
        Pronóstico generado el: {formattedDate}
      </p>
    </header>
  );
}

export default Header;