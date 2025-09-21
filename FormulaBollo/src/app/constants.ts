// Errors
export const ERROR_TEAM_FETCH: string = "No se pudo obtener los equipos correctamente";
export const ERROR_SEASON_FETCH: string = "No se pudo obtener las temporadas correctamente";
export const ERROR_STATUTE_FETCH: string = "No se puedo obtener el estatuto correctamente";
export const ERROR_RESULT_FETCH: string = "No se ha podido recoger los resultados";
export const ERROR_RACE_FETCH: string = "No se ha podido recoger la carrera correctamente";
export const ERROR_DRIVER_FETCH: string = "No se puedo obtener los puntos de los pilotos correctamente";
export const ERROR_CONFIGURATION_FETCH: string = "No se pudo obtener las configuraciones correctamente";
export const ERROR_PENALTY_TYPE_FETCH: string = "No se han podido recoger los tipos de penalización";
export const ERROR_PENALTY_FETCH: string = "No se han podido recoger las penalización";
export const ERROR_POINT_FETCH: string = "Al parecer hubo problemas al recoger los puntos";
export const ERROR_PRICE_FETCH: string = "Al parecer hubo problemas al recoger los precios";
export const ERROR_PENALTIES_FETCH: string = "No se ha podido recoger las penalizaciones correctamente";
export const ERROR_DRIVER_INFO_FETCH: string = "No se ha podido recoger la información del piloto correctamente";
export const ERROR_DRIVER_TEAM_FETCH: string = "No se ha podido recoger los pilotos correctamente";
export const ERROR_TEAM_INFO_FETCH: string = "No se ha podido recoger la información del equipo correctamente";
export const ERROR_SAVE: string = "No se ha podido guardar correctamente";
export const ERROR_ARCHIVE_NOT_VALID: string = "Ocurrió un error al procesar el archivo";
export const ERROR_EMAIL_NOT_VALID: string = "El email introducido no es válido";
export const ERROR_FORM_NOT_VALID: string = "No has rellenado correctamente el formulario";
export const ERROR_FANTASY_DRIVER_IN_TEAM: string = "No puedes poner un piloto como equipo";
export const ERROR_FANTASY_TEAM_IN_DRIVER: string = "No puedes poner un equipo como piloto";
export const ERROR_FANTASY_POINTS: string = "No se ha podido recoger los puntos del fantasy";
export const ERROR_FANTASY_ELECTION_SAVE: string = "No se ha podido guardar tu equipo correctamente. Contacta con el administrador";
export const ERROR_FANTASY_ELECTION_NOT_FOUND: string = "No se ha podido recoger tu equipo correctamente. Contacta con el administrador";
export const ERROR_DRIVER_NAME_NOT_FOUND: string = "No hay ningún piloto con ese nombre";
export const ERROR_TEAM_NAME_NOT_FOUND: string = "No hay ningún equipo con ese nombre";
export const ERROR_RECORDS_NOT_FOUND: string = "No hay records de los pilotos";
export const ERROR_EVOLUTION_POINTS_NOT_FOUND: string = "Error la evolución de puntos";
export const ERROR_CACHE: string = "Error al obtener la versión de la caché: ";
export const ERROR_LOGIN_CREDENTIALS: string = "Credenciales incorrectas.";
export const ERROR_RECOVER_PASSWORD: string = "Correo incorrecto.";
export const ERROR_CHANGE_PASSWORD: string = "No se pudo cambiar la contraseña.";

// Warnings
export const WARNING_NO_ADMIN: string = "No tienes permisos de administrador";
export const WARNING_NO_LOGIN: string = "Debes de haber iniciado sesión para acceder a esta página";
export const WARNING_PDF: string = "Tiene que ser un archivo pdf";
export const WARNING_ARCHIVE_NOT_SELECTED: string = "No se ha seleccionado ningún archivo";
export const WARNING_DATE_RACE_NOT_SELECTED: string = "Tienes que seleccionar una fecha de inicio";
export const WARNING_DRIVER_DUPLICATED: string = "Hay un piloto duplicado en los resultados";
export const WARNING_MONEY_NEGATIVE: string = "No puedes tener dinero en negativo";
export const WARNING_ELECTION_NOT_COMPLETED: string = "Tienes que rellenar tu equipo entero";
export const WARNING_FANTASY_SAVE_LATE: string = "Demasiado tarde para guardar el equipo, el plazo son 12 horas antes de la carrera";

// Success
export const SUCCESS_SAVE: string = "Se ha guardado correctamente";
export const SUCCESS_LOGIN: string = "Has iniciado sesión correctamente.";
export const SUCCESS_LOGOUT: string = "Has cerrado sesión correctamente.";
export const SUCCESS_REGISTER : string = "Te has registrado correctamente";

// CACHE
export const CACHE_NAME_LOCAL_STORAGE: string = 'cacheVersion';


// CHARTS
export const colorsMappings: { [key: string]: string } = {
  "Mercedes": "#6cd3bf",
  "Red Bull": "#3671c6",
  "Ferrari": "#f91536",
  "McLaren": "#f58020",
  "Alpine": "#2293d1",
  "AlphaTauri": "#5e8faa",
  "Aston Martin": "#358c75",
  "Alfa Romeo": "#c92d4b",
  "Haas": "#b6babd",
  "Williams": "#37bedd",
  "RB": "#6692ff",
  "Kick Sauber": "#52e252"
};

export function getBarChartOptions(isDarkMode: boolean): any {
  return {
    maintainAspectRatio: false,
    aspectRatio: 0.8,
    plugins: {
      datalabels: {
        display: false
      },
      legend: {
        display: false
      },
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: isDarkMode ? 'rgb(220, 220, 220)' : 'rgb(150, 150, 150)',
          font: {
            size: 12,
            weight: '500'
          },
        }
      },
      y: {
        grid: {
          color: "rgba(200, 200, 200, 0.2)"
        },
        ticks: {
          color: isDarkMode ? 'rgb(220, 220, 220) ' : 'rgb(150, 150, 150)',
        }
      },
    }
  }
};

export function getBarMobileChartOptions(isDarkMode: boolean): any {
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    aspectRatio: 0.8,
    plugins: {
      datalabels: {
        display: false
      },
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(200, 200, 200, 0.2)'
        },
        ticks: {
          color: isDarkMode ? 'rgb(220, 220, 220)' : 'rgb(150, 150, 150)',
          font: {
            size: 12,
            weight: '500'
          }
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          color: isDarkMode ? 'rgb(220, 220, 220) ' : 'rgb(150, 150, 150)',
          font: {
            size: 12,
            weight: '500'
          }
        }
      }
    }
  }
};

export function getPieChartOptions(isDarkMode: boolean): any {
  return {
    responsive: true,
    aspectRatio: 0.9,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: false
      },
      legend: {
        position: 'right',
        labels: {
          color: isDarkMode ? 'rgb(220, 220, 220) ' : 'rgb(150, 150, 150)'
        }
      },
    },
  }
};

export function getLineChartOptions(isDarkMode: boolean, displayLegend: boolean = true): any {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: false
      },
      legend: {
        display: displayLegend,
        position: 'top',
        labels: {
          color: isDarkMode ? 'rgb(220, 220, 220) ' : 'rgb(150, 150, 150)',
          usePointStyle: true,
          boxWidth: 10,
          padding: 20
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false
      },
    },
    scales: {
      x: {
        ticks: {
          color: isDarkMode ? 'rgb(220, 220, 220) ' : 'rgb(150, 150, 150)'
        },
        grid: {
          color: "rgba(200, 200, 200, 0.2)"
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: isDarkMode ? 'rgb(220, 220, 220) ' : 'rgb(150, 150, 150)'
        },
        grid: {
          color: "rgba(200, 200, 200, 0.2)"
        }
      }
    }
  }
};
function createComparisonChartOptions(isDarkMode: boolean, isMobile: boolean = false): any {
  const labelColor = isDarkMode ? 'rgb(220, 220, 220)' : 'rgb(150, 150, 150)';

  const baseOptions: any = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: labelColor
        }
      },
      datalabels: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: labelColor,
          font: {
            size: 12,
            weight: '500'
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(200, 200, 200, 0.2)"
        },
        ticks: {
          color: labelColor,
          stepSize: 1
        }
      }
    }
  };

  if (isMobile) {
    baseOptions.indexAxis = 'y';
  }

  return baseOptions;
}

export function getComparisonChartOptions(isDarkMode: boolean): any {
  return createComparisonChartOptions(isDarkMode);
}

export function getComparisonChartOptionsMobile(isDarkMode: boolean): any {
  return createComparisonChartOptions(isDarkMode, true);
}