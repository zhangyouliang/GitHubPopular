import React, {Component} from 'react';
import {
  View,
  Text,
  Image,
  Alert,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native'
import NavigationBar from '../../common/NavigationBar'
import ViewUtils from '../../util/ViewUtils'
import ArrayUtils from '../../util/ArrayUtils'
import LanguageDao, {FLAG_LANGUAGE} from '../../expand/dao/LanguageDao'
import CheckBox from 'react-native-check-box'

export default class CustomKeyPage extends Component {
  constructor(props) {
    super(props);
    const {params} = this.props.navigation.state;
    this.languageDao = new LanguageDao(params.flag);
    this.flag = params.flag;
    this.isRemoveKey = params.isRemoveKey;
    this.changeValues = [];
    this.state = {
      dataArray: []
    };
  }

  componentDidMount() {
    this.loadData();
  }

  //加载本地存储的数据
  loadData() {
    this.languageDao.fetch()
      .then(result => {
        this.setState({
          dataArray: result
        })
      })
      .catch(err => {
        console.log(err);
      })
  }

  //保存
  onSave() {
    if (this.changeValues.length === 0) {
      this.props.navigation.goBack();
      return;
    }
    if (this.isRemoveKey) {
      for (let i = 0, l = this.changeValues.length; i < l; i++) {
        ArrayUtils.remove(this.state.dataArray, this.changeValues[i]);
      }
    }

    this.languageDao.save(this.state.dataArray);
    this.props.navigation.goBack();
  }

  //返回
  onBack() {
    if (this.changeValues.length > 0) {
      Alert.alert(
        '提示',
        '要保存修改吗？',
        [
          {
            text: '否', onPress: () => {
              this.props.navigation.goBack();
            }
          },
          {
            text: '是', onPress: () => {
              this.onSave();
            }
          }
        ]
      )
    } else {
      this.props.navigation.goBack();
    }
  }

  renderView() {
    if (!this.state.dataArray || this.state.dataArray.length === 0) return null;
    let len = this.state.dataArray.length;
    let views = [];
    for (let i = 0, l = len - 2; i < l; i += 2) {
      views.push(
        <View key={i}>
          <View style={styles.item}>
            {this.renderCheckBox(this.state.dataArray[i])}
            {this.renderCheckBox(this.state.dataArray[i + 1])}
          </View>
          <View style={styles.line}/>
        </View>
      )
    }

    views.push(
      <View key={len - 1}>
        <View style={styles.item}>
          {len % 2 === 0 ? this.renderCheckBox(this.state.dataArray[len - 2]) : null}
          {this.renderCheckBox(this.state.dataArray[len - 1])}
        </View>
        <View style={styles.line}/>
      </View>
    );
    return views;
  }

  onClick(data) {
    if (!this.isRemoveKey) data.checked = !data.checked;
    ArrayUtils.updateArray(this.changeValues, data);
  }

  renderCheckBox(data) {
    let leftText = data.name;
    let isChecked = this.isRemoveKey ? false : data.checked;
    return (
      <CheckBox
        style={{flex: 1, padding: 10}}
        onClick={() => this.onClick(data)}
        isChecked={isChecked}
        leftText={leftText}
        checkedImage={<Image style={{tintColor: '#2196F3'}} source={require('./images/ic_check_box.png')}/>}
        unCheckedImage={<Image style={{tintColor: '#2196F3'}}
                               source={require('./images/ic_check_box_outline_blank.png')}/>}
      />
    )
  }

  render() {
    let rightButtonTitle = this.isRemoveKey ? '移除' : '保存';
    let title = this.isRemoveKey ? '标签移除' : '自定义标签';
    title = this.flag === FLAG_LANGUAGE.flag_language ? '自定义语言' : title;
    return (
      <View style={styles.container}>
        <NavigationBar
          title={title}
          statusBar={{
            backgroundColor: '#2196F3'
          }}
          leftButton={ViewUtils.getLeftButton(() => {
            this.onBack()
          })}
          rightButton={ViewUtils.getRightButton(rightButtonTitle, () => this.onSave())}
        />
        <ScrollView>
          {this.renderView()}
        </ScrollView>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5fcff'
  },
  title: {
    fontSize: 20,
    color: '#fff',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  line: {
    height: 0.5,
    backgroundColor: 'darkgray'
  }
});