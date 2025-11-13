import { useState } from 'react';
import {
  Button, TextField, Dialog, DialogActions,
  DialogContent, DialogTitle, Box, Fab, Autocomplete
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PostAddIcon from '@mui/icons-material/PostAdd';
import dayjs from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import axios from 'axios';
import Tooltip from '@mui/material/Tooltip';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE_URL = "https://fastapi-mionjoapi-alertemionjo1455-9k2qh0ff.leapcell.dev";

// Styles constants
const STYLES = {
  fab: {
    backgroundColor: '#f9aa33',
    color: '#000',
    '&:hover': { backgroundColor: '#e89922' },
    '&:focus': { outline: 'none', backgroundColor: '#f9aa33' },
    '&.Mui-focusVisible': { outline: 'none' }
  },
  primaryButton: {
    backgroundColor: '#f9aa33',
    color: '#000',
    borderRadius: 2,
    px: 3,
    '&:hover': { backgroundColor: '#e89922' },
    '&:disabled': {
      backgroundColor: '#f9aa3380',
      color: '#00000060'
    }
  },
  secondaryButton: {
    backgroundColor: '#e8f0f6',
    color: '#000',
    borderRadius: 2,
    px: 3,
    '&:hover': { backgroundColor: '#d0e0f0' }
  }
};

const getUniqueResponsables = (rows) => {
  const uniqueResponsables = [];
  const seen = new Set();

  rows.forEach(r => {
    if (r.nom && !seen.has(r.nom)) {
      seen.add(r.nom);
      uniqueResponsables.push({
        id: r.id,
        nom: r.nom,
        mail: r.mail || '',
        num: r.num,
      });
    }
  });

  return uniqueResponsables;
};

const getStatusBasedOnDate = (dateValue) => {
  const today = dayjs().startOf('day');
  const dateLimite = dateValue.startOf('day');
  return dateLimite.isSame(today, 'day') ? 'En cours' : 'En cours';
};

export default function AddActivityDialog({ refreshRows, row }) {
  // State management
  const [open, setOpen] = useState(false);
  const [dateValue, setDateValue] = useState(dayjs());
  const [suggest, setSuggest] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedResponsable, setSelectedResponsable] = useState(null);
  const [email, setEmail] = useState('');
  //const [num, setNum] = useState(null);

  const handleDateChange = (newValue) => {
    if (!newValue) return;
    const fixed = newValue.minute(0).second(0);
    setDateValue(fixed);
  };

  const handleClickOpen = () => {
    setOpen(true);
    setSuggest(getUniqueResponsables(row));
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedResponsable(null);
    setEmail('');
  };

  const handleResponsableChange = (event, newValue) => {
    setSelectedResponsable(newValue);

    if (newValue && typeof newValue === 'object') {
      setEmail(newValue.mail || '');
    } else if (typeof newValue === 'string') {
      const found = suggest.find(s => s.nom.toLowerCase() === newValue.toLowerCase());
      setEmail(found ? found.mail : '');
    } else {
      setEmail('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;

    const formData = {
      nom: typeof selectedResponsable === 'string'
        ? selectedResponsable
        : (selectedResponsable?.nom || form.nom.value),
      mail: email || form.mail.value,
      //num: Number(form.num.value),
      raison: form.raison.value,
      observation: form.observation.value || '',
      datelimite: dateValue.format("YYYY-MM-DDTHH:mm"),
      statut: getStatusBasedOnDate(dateValue)
    };

    if (!formData.nom || !formData.mail || !formData.raison) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.get(`${API_BASE_URL}/post_tout_web/`, {
        params: formData
      });
      handleClose();
      console.log("✅ Réponse du backend :", response.data);
      toast.success("Activité ajoutée avec succès ✅");
      
      if (refreshRows) {
        await refreshRows();
      }
      
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi:", error.response?.data || error);
      const errorMessage = error.response?.data?.message || error.message || "Erreur lors de l'ajout";
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box sx={{ 
        '& > :not(style)': { m: 1 },
        position: 'relative',
        zIndex: 1
      }}>
        <Tooltip title='Nouvelle activité'>
          <Fab
            aria-label="Ajouter une nouvelle activité"
            onClick={handleClickOpen}
            sx={STYLES.fab}
          >
            <AddIcon />
          </Fab>
        </Tooltip>
      </Box>

      <Dialog 
        open={open} 
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        TransitionProps={{
          timeout: 300
        }}
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
        keepMounted={false}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 2 }}>
          <PostAddIcon sx={{ color: "#f9aa33"}}/>
          Ajout de nouvelle activité
        </DialogTitle>

        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} id="activity-form" sx={{ pt: 1 }}>
            <Autocomplete
              freeSolo
              disablePortal
              options={suggest}
              value={selectedResponsable}
              onChange={handleResponsableChange}
              getOptionKey={(option) => option.id}
              getOptionLabel={(option) =>
                typeof option === 'string' ? option : option.nom
              }
              fullWidth
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Responsable" 
                  name="nom" 
                  required 
                  margin="dense"
                />
              )}
            />

            <TextField
              required
              margin="dense"
              name="mail"
              label="Email"
              type="email"
              fullWidth
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            {/*<TextField
              required
              focused
              margin="dense"
              name="num"
              label="Numéro de téléphone (*Whatsapp)"
              type="text"
              fullWidth
              variant="outlined"
              value={num}
              onChange={(e) => {
                setNum(e.target.value);
                handleChange
              }}
              inputProps={{ inputMode: "tel", pattern: '[0-9]*'}}
              autoComplete="num"
            />*/}

            <TextField
              required
              margin="dense"
              name="raison"
              label="Activité"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={4}
            />

            <TextField
              margin="dense"
              name="observation"
              label="Observation (optionnel)"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={2}
            />

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label="Date limite"
                value={dateValue}
                onChange={handleDateChange}
                format="DD/MM/YYYY HH:00"
                ampm={false}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: "dense",
                    required: true
                  }
                }}
              />
            </LocalizationProvider>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            sx={STYLES.secondaryButton}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            form="activity-form"
            disabled={loading}
            sx={STYLES.primaryButton}
          >
            {loading ? "Ajout en cours..." : "Ajouter"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}