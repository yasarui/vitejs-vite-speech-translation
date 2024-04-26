import React, { useEffect, useState } from 'react';
import { Input, Row, Col, Button, Select, Spin } from 'antd';
import JSZip from 'jszip';
import * as fileSaver from 'file-saver';
import Crunker from 'crunker';
import voicesData from './sample.json';
import babyCrying from '../../assets/baby-crying.mp3';
import dagBarking from '../../assets/dog-barking.mp3';
import './Form.css';

const AudioForm = ({ incrementFormCount }) => {
  let crunker = new Crunker();
  const [voices, setVoices] = useState([]);
  const [maleVoices, setMaleVoices] = useState([]);
  const [femaleVoices, setFemaleVoices] = useState([]);
  const [translatedVoices, setTranslatedVoices] = useState([]);
  const [isDownload, setIsDownload] = useState(false);
  const [showAddBtn, toogleAddBtn] = useState(false);
  const [disableForm, toogleDisableForm] = useState(false);
  const [utterance, setUtterance] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState([]);
  const [addon, setAddon] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAddButtonClicked, setIsAddButtonClicked] = useState(false);

  const fetchData = () => {
    const maleVoiceOptions = [];
    const femaleVoiceOptions = [];
    const voiceSelectOptions = [];

    const headerDict = {
      'xi-api-key': '1d7cc8dacf25522f3d6235c1262323df',
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
    };

    const requestOptions = {
      method: 'GET',
      headers: headerDict,
    };

    fetch('https://api.elevenlabs.io/v1/voices', requestOptions)
      .then((response) => response.json())
      .then((result) => {
        result.voices.forEach((o) => {
          const gender = o.labels.gender;
          if (gender === 'male') {
            maleVoiceOptions.push({
              voice_id: o.voice_id,
              value: o.voice_id,
              name: o.name,
              accent: o.labels.accent,
              age: o.labels.age,
              gender: o.labels.gender,
              description: `${o.name} - ${o.labels.accent} ${o.labels.age} ${o.labels.gender} voice`,
            });
          } else if (gender === 'female') {
            femaleVoiceOptions.push({
              voice_id: o.voice_id,
              value: o.voice_id,
              name: o.name,
              accent: o.labels.accent,
              age: o.labels.age,
              gender: o.labels.gender,
              description: `${o.name} - ${o.labels.accent} ${o.labels.age} ${o.labels.gender} voice`,
            });
          }
        });

        setVoices([...maleVoiceOptions, ...femaleVoiceOptions]);
        setMaleVoices(maleVoiceOptions);
        setFemaleVoices(femaleVoiceOptions);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isSubmitDisabled = () => {
    return (
      utterance.trim() === '' ||
      gender.trim() === '' ||
      age.join().trim() === ''
    );
  };

  const isAgeDropDownDisabled = () => {
    return gender.trim() === '';
  };

  const getAgeDropDownOptions = () => {
    if (isAgeDropDownDisabled()) return [];
    if (gender === 'male') {
      return maleVoices.map((item) => {
        return {
          value: item.voice_id,
          label: item.description,
        };
      });
    } else if (gender === 'female') {
      return femaleVoices.map((item) => {
        return {
          value: item.voice_id,
          label: item.description,
        };
      });
    }
    return [];
  };

  const handleSubmit = () => {
    const textInputs = [];
    const obj = { utterance, gender, age, addon };
    console.log({ obj });
    var id = 0;
    age.forEach((x) => {
      let data = {};
      id = id + 1;
      data.id = id + 1;
      data.voice = x;
      data.text = utterance;
      textInputs.push(data);
    });
    setLoading(true);
    textInputs.forEach((item) => {
      generateText(item, (translatedVoice) => {
        setTranslatedVoices((prev) => [...prev, translatedVoice]);
        setIsDownload(true);
        setLoading(false);
      });
    });
  };

  const onDownloadAudios = (datalist) => {
    const zip = new JSZip();
    let addonNoise;
    if (addon === 'dog') {
      addonNoise = dagBarking;
    } else if (addon === 'baby') {
      addonNoise = babyCrying;
    } else {
      addonNoise = null;
    }

    if (addonNoise) {
      const audioBlobs = [];
      const promises = []; // Array to store promises for each file processing

      datalist.forEach(function (data, index) {
        var fileName =
          getVoiceDescription(data.voice, voices) || `sample-${index}`;
        var file = new File([data.audioBlob], fileName, { type: 'audio/wav' });

        const promise = crunker
          .fetchAudio(file, addonNoise)
          .then((buffers) => {
            // => [AudioBuffer, AudioBuffer]
            return crunker.mergeAudio(buffers);
          })
          .then((merged) => {
            // => AudioBuffer
            return crunker.export(merged, 'audio/mp3');
          })
          .then((output) => {
            var fileName =
              getVoiceDescription(data.voice, voices) || `sample-${index}`;
            //audioBlobs.push(output.blob); //
            var file = new File([output.blob], fileName, {
              type: 'audio/wav',
            });
            console.log({ file });
            zip.file(fileName + '_' + index + '.wav', file);
          })
          .catch((error) => {
            // => Error Message
          });

        promises.push(promise);
      });

      // Wait for all promises to resolve
      Promise.all(promises)
        .then(() => {
          // Generate and download zip file after all files have been processed
          zip.generateAsync({ type: 'blob' }).then(function (content) {
            fileSaver.saveAs(content, 'audios.zip');
          });
        })
        .catch((error) => {
          // Handle errors if any
        });
    } else {
      datalist.forEach(function (data, index) {
        var fileName =
          getVoiceDescription(data.voice, voices) || `sample-${index}`;
        var file = new File([data.audioBlob], fileName, {
          type: 'audio/wav',
        });
        zip.file(fileName + '_' + index + '.wav', file);
      });

      zip.generateAsync({ type: 'blob' }).then(function (content) {
        fileSaver.saveAs(content, 'audios.zip');
      });
    }

    toogleDisableForm(true);
    toogleAddBtn(true);
  };

  const getVoiceDescription = (voiceId, voicesArray) => {
    const voice = voicesArray.find((item) => item.voice_id === voiceId);
    return voice ? voice.description : '';
  };

  const generateText = (data, callback) => {
    const voices = [];

    const headerDict = {
      'xi-api-key': '1d7cc8dacf25522f3d6235c1262323df',
      'Accept-Type': 'audio/mpeg',
      'Content-Type': 'application/json',
    };

    const requestOptions = {
      method: 'POST',
      headers: new Headers(headerDict),
      body: JSON.stringify({
        text: data.text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
      responseType: 'blob',
    };

    fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${data.voice}`,
      requestOptions
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.blob();
      })
      .then((result) => {
        const obj = { ...data };
        obj.audioClip = true;
        obj.isAudioFileAvailable = true;
        obj.audioBlob = result;
        callback(obj);
      })
      .catch((error) => {
        console.error('There was a problem with the fetch operation:', error);
      });
  };

  const handleIncrementBtnClick = () => {
    setIsAddButtonClicked(true);
    incrementFormCount();
  };

  return (
    <Spin spinning={loading}>
      <div className="form-wrapper">
        <Row style={{ margin: '0 50px' }} gutter={16}>
          <Col span={8}>
            <label> Utterances </label>
            <Input
              value={utterance}
              disabled={disableForm}
              onChange={(e) => setUtterance(e.target.value)}
            />
          </Col>
          <Col span={2}>
            <label> Gender </label>
            <Select
              value={gender}
              disabled={disableForm}
              onChange={(value) => setGender(value)}
              style={{ width: '100%' }}
              options={[
                {
                  value: 'male',
                  label: 'Male',
                },
                {
                  value: 'female',
                  label: 'Female',
                },
              ]}
            ></Select>
          </Col>
          <Col span={8}>
            <label> Age </label>
            <Select
              showSearch={false}
              maxTagCount={'responsive'}
              style={{ width: '100%' }}
              mode="multiple"
              maxTagCoun="responsive"
              disabled={disableForm || isAgeDropDownDisabled()}
              defaultValue={age}
              onChange={(value) => setAge(value)}
              options={getAgeDropDownOptions()}
            ></Select>
          </Col>
          <Col span={2}>
            <label> Addon </label>
            <Select
              disabled={disableForm}
              style={{ width: '100%' }}
              value={addon}
              onChange={(value) => setAddon(value)}
              options={[
                {
                  value: 'dog',
                  label: 'Dog barking',
                },
                {
                  value: 'baby',
                  label: 'Baby Crying',
                },
              ]}
            ></Select>
          </Col>
          <Col span={4}>
            <label> Action </label>
            <div>
              <Button
                onClick={handleSubmit}
                disabled={disableForm || isSubmitDisabled()}
                type="primary"
                className="submit-btn"
              >
                Submit
              </Button>
              {isDownload && (
                <Button
                  disabled={disableForm}
                  className="download-btn"
                  onClick={() => onDownloadAudios(translatedVoices)}
                >
                  Download
                </Button>
              )}
              {isDownload && showAddBtn && (
                <Button
                  disabled={isAddButtonClicked}
                  onClick={handleIncrementBtnClick}
                >
                  Add
                </Button>
              )}
            </div>
          </Col>
        </Row>
      </div>
    </Spin>
  );
};

export { AudioForm };
